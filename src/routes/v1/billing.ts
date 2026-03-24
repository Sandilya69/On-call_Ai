// ============================================
// OnCall Maestro — Billing Routes (Phase 5)
// ============================================
// Stripe checkout, portal, subscription status, and webhook.

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { bearerAuth, requireRole } from "../../middleware/auth.js";
import type { AuthUser } from "../../middleware/auth.js";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  handleStripeWebhook,
  PLANS,
} from "../../integrations/stripe.js";
import type { PlanId } from "../../integrations/stripe.js";
import { logger } from "../../utils/logger.js";

const log = logger.child({ component: "billing-routes" });

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user as AuthUser;
}

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  // List available plans
  app.get("/billing/plans", async (_request, reply) => {
    const plans = Object.entries(PLANS).map(([id, config]) => ({
      id,
      name: config.name,
      maxEngineers: config.maxEngineers,
      maxTeams: config.maxTeams,
      maxIncidentsPerMonth: config.maxIncidentsPerMonth,
      features: config.features,
    }));
    return reply.send({ plans });
  });

  // Get current subscription status
  app.get("/billing/status", { preHandler: [bearerAuth] }, async (request, reply) => {
    const user = getUser(request);
    const status = await getSubscriptionStatus(user.orgId);
    return reply.send(status || { plan: "free", status: "none" });
  });

  // Create checkout session (upgrade to paid plan)
  app.post(
    "/billing/checkout",
    { preHandler: [bearerAuth, requireRole("lead", "manager")] },
    async (request, reply) => {
      const user = getUser(request);
      const body = request.body as { plan: PlanId; successUrl?: string; cancelUrl?: string };

      if (!body.plan || !PLANS[body.plan]) {
        return reply.status(400).send({ error: "Invalid plan" });
      }

      if (body.plan === "free") {
        return reply.status(400).send({ error: "Cannot checkout for free plan" });
      }

      const baseUrl = process.env["APP_BASE_URL"] || `http://localhost:${process.env["PORT"] || 3000}`;
      const successUrl = body.successUrl || `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = body.cancelUrl || `${baseUrl}/billing/cancelled`;

      const checkoutUrl = await createCheckoutSession(user.orgId, body.plan, successUrl, cancelUrl);

      if (!checkoutUrl) {
        return reply.status(503).send({
          error: "Billing not available",
          message: "Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs in environment.",
        });
      }

      log.info({ orgId: user.orgId, plan: body.plan }, "Checkout session created");
      return reply.send({ url: checkoutUrl });
    }
  );

  // Create billing portal session (manage existing subscription)
  app.post(
    "/billing/portal",
    { preHandler: [bearerAuth, requireRole("lead", "manager")] },
    async (request, reply) => {
      const user = getUser(request);
      const body = request.body as { returnUrl?: string } | undefined;

      const baseUrl = process.env["APP_BASE_URL"] || `http://localhost:${process.env["PORT"] || 3000}`;
      const returnUrl = body?.returnUrl || `${baseUrl}/dashboard`;

      const portalUrl = await createPortalSession(user.orgId, returnUrl);

      if (!portalUrl) {
        return reply.status(503).send({
          error: "Billing portal not available",
          message: "Stripe is not configured or no active subscription found.",
        });
      }

      return reply.send({ url: portalUrl });
    }
  );

  // Stripe webhook endpoint (no auth — verified via Stripe signature)
  app.post("/billing/webhook", {
    config: { rawBody: true }, // Need raw body for signature verification
  }, async (request, reply) => {
    const signature = request.headers["stripe-signature"] as string;

    if (!signature) {
      return reply.status(400).send({ error: "Missing stripe-signature header" });
    }

    // Get raw body — Fastify needs special handling
    const rawBody = typeof request.body === "string"
      ? request.body
      : JSON.stringify(request.body);

    const result = await handleStripeWebhook(rawBody, signature);

    if (result.processed) {
      log.info({ event: result.event }, "Stripe webhook processed");
      return reply.send({ received: true, event: result.event });
    }

    return reply.status(400).send({ error: "Webhook processing failed" });
  });
}
