// ============================================
// OnCall Maestro — Stripe Billing (PRD Phase 5)
// ============================================
// Manages subscriptions, billing portal, and usage metering.

import Stripe from "stripe";
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

const log = logger.child({ component: "stripe" });

// ── Stripe Client ───────────────────────────────

function getStripeClient(): Stripe | null {
  const apiKey = process.env["STRIPE_SECRET_KEY"];
  if (!apiKey) {
    log.warn("STRIPE_SECRET_KEY not configured — billing disabled");
    return null;
  }
  return new Stripe(apiKey, { apiVersion: "2025-02-24.acacia" as any });
}

// ── Price/Plan Configuration ────────────────────

export const PLANS = {
  free: {
    name: "Free",
    maxEngineers: 5,
    maxTeams: 2,
    maxIncidentsPerMonth: 100,
    features: ["basic_alerts", "discord_notifications", "manual_rota"],
    stripePriceId: null,
  },
  pro: {
    name: "Pro",
    maxEngineers: 25,
    maxTeams: 10,
    maxIncidentsPerMonth: 5000,
    features: [
      "basic_alerts",
      "discord_notifications",
      "ai_routing",
      "voice_handovers",
      "calendar_sync",
      "sms_notifications",
      "auto_rota",
    ],
    stripePriceId: process.env["STRIPE_PRO_PRICE_ID"] || null,
  },
  enterprise: {
    name: "Enterprise",
    maxEngineers: -1, // unlimited
    maxTeams: -1,
    maxIncidentsPerMonth: -1,
    features: [
      "basic_alerts",
      "discord_notifications",
      "ai_routing",
      "voice_handovers",
      "calendar_sync",
      "sms_notifications",
      "voice_calls",
      "auto_rota",
      "sla_monitoring",
      "custom_integrations",
    ],
    stripePriceId: process.env["STRIPE_ENTERPRISE_PRICE_ID"] || null,
  },
} as const;

export type PlanId = keyof typeof PLANS;

// ── Customer Management ─────────────────────────

/**
 * Create or retrieve a Stripe customer for an organisation.
 */
export async function getOrCreateCustomer(orgId: string): Promise<string | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const org = await prisma.organisation.findUnique({ where: { id: orgId } });
  if (!org) return null;

  const settings = JSON.parse(org.settings || "{}");

  // Return existing customer ID
  if (settings.stripeCustomerId) {
    return settings.stripeCustomerId;
  }

  try {
    const customer = await stripe.customers.create({
      name: org.name,
      metadata: { orgId: org.id, orgSlug: org.slug },
    });

    // Save customer ID to org settings
    settings.stripeCustomerId = customer.id;
    await prisma.organisation.update({
      where: { id: orgId },
      data: { settings: JSON.stringify(settings) },
    });

    log.info({ orgId, customerId: customer.id }, "Stripe customer created");
    return customer.id;
  } catch (err) {
    log.error({ err, orgId }, "Failed to create Stripe customer");
    return null;
  }
}

// ── Subscription Management ─────────────────────

/**
 * Create a checkout session for upgrading to a paid plan.
 */
export async function createCheckoutSession(
  orgId: string,
  plan: PlanId,
  successUrl: string,
  cancelUrl: string
): Promise<string | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const planConfig = PLANS[plan];
  if (!planConfig.stripePriceId) {
    log.warn({ plan }, "No Stripe price ID configured for plan");
    return null;
  }

  const customerId = await getOrCreateCustomer(orgId);
  if (!customerId) return null;

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orgId, plan },
      subscription_data: {
        metadata: { orgId, plan },
      },
    });

    log.info({ orgId, plan, sessionId: session.id }, "Checkout session created");
    return session.url;
  } catch (err) {
    log.error({ err, orgId }, "Failed to create checkout session");
    return null;
  }
}

/**
 * Create a billing portal session for managing subscriptions.
 */
export async function createPortalSession(
  orgId: string,
  returnUrl: string
): Promise<string | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const customerId = await getOrCreateCustomer(orgId);
  if (!customerId) return null;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  } catch (err) {
    log.error({ err, orgId }, "Failed to create portal session");
    return null;
  }
}

/**
 * Get the current subscription status for an organisation.
 */
export async function getSubscriptionStatus(orgId: string): Promise<{
  plan: PlanId;
  status: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
} | null> {
  const stripe = getStripeClient();

  const org = await prisma.organisation.findUnique({ where: { id: orgId } });
  if (!org) return null;

  const settings = JSON.parse(org.settings || "{}");

  // If no Stripe, return based on org.plan
  if (!stripe || !settings.stripeCustomerId) {
    return {
      plan: (org.plan as PlanId) || "free",
      status: "active",
    };
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: settings.stripeCustomerId,
      status: "all",
      limit: 1,
    });

    const sub = subscriptions.data[0];
    if (!sub) {
      return { plan: "free", status: "none" };
    }

    return {
      plan: (sub.metadata["plan"] as PlanId) || "pro",
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  } catch (err) {
    log.error({ err, orgId }, "Failed to get subscription status");
    return { plan: (org.plan as PlanId) || "free", status: "unknown" };
  }
}

// ── Webhook Handler ─────────────────────────────

/**
 * Process Stripe webhook events.
 */
export async function handleStripeWebhook(
  rawBody: string,
  signature: string
): Promise<{ processed: boolean; event?: string }> {
  const stripe = getStripeClient();
  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];

  if (!stripe || !webhookSecret) {
    return { processed: false };
  }

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.["orgId"];
        const plan = session.metadata?.["plan"] as PlanId;

        if (orgId && plan) {
          await prisma.organisation.update({
            where: { id: orgId },
            data: { plan },
          });

          await prisma.auditLog.create({
            data: {
              orgId,
              actorType: "system",
              action: "billing.subscription_created",
              entityType: "organisation",
              entityId: orgId,
              metadata: JSON.stringify({ plan, sessionId: session.id }),
            },
          });

          log.info({ orgId, plan }, "Subscription activated");
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata["orgId"];
        if (orgId) {
          const newPlan = sub.metadata["plan"] || "pro";
          await prisma.organisation.update({
            where: { id: orgId },
            data: { plan: newPlan },
          });
          log.info({ orgId, plan: newPlan, status: sub.status }, "Subscription updated");
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata["orgId"];
        if (orgId) {
          await prisma.organisation.update({
            where: { id: orgId },
            data: { plan: "free" },
          });
          log.info({ orgId }, "Subscription cancelled — reverted to free");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        log.warn(
          { customerId: invoice.customer, invoiceId: invoice.id },
          "Payment failed"
        );
        break;
      }

      default:
        log.debug({ type: event.type }, "Unhandled Stripe event");
    }

    return { processed: true, event: event.type };
  } catch (err) {
    log.error({ err }, "Stripe webhook processing failed");
    return { processed: false };
  }
}
