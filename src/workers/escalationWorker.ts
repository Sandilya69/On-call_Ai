// ============================================
// OnCall Maestro — Escalation Worker (PRD 7.5)
// ============================================
// Handles escalation timers. When ACK window expires,
// escalates to the next engineer in the chain.

import { Worker, Job } from "bullmq";
import { prisma } from "../config/database.js";
import { getAckState } from "../services/dedup.js";
import { sendDiscordDM, sendDiscordChannelAlert } from "../integrations/discord.js";
import { notificationQueue } from "./queues.js";
import { logger } from "../utils/logger.js";
import type { EscalationJobData, NotificationJobData } from "./queues.js";

const log = logger.child({ component: "escalation-worker" });

/**
 * Process an escalation timer job.
 * Idempotent — safe to retry on failure.
 */
async function processEscalation(job: Job<EscalationJobData>): Promise<void> {
  const { incidentId, escalationLevel, currentAssigneeId, teamId, orgId } = job.data;
  log.info({ incidentId, level: escalationLevel }, "Escalation timer fired");

  // 1. Check if already acknowledged or resolved
  const ackState = await getAckState(incidentId);
  if (ackState) {
    log.info({ incidentId }, "Incident already acknowledged — skipping escalation");
    return;
  }

  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident || incident.status === "acknowledged" || incident.status === "resolved") {
    log.info({ incidentId, status: incident?.status }, "Incident no longer open — skipping");
    return;
  }

  // 2. Get the escalation policy for this team
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { escalationPolicy: true, members: { include: { engineer: true } } },
  });

  if (!team?.escalationPolicy) {
    log.warn({ teamId }, "No escalation policy found for team");
    return;
  }

  const policy = team.escalationPolicy;

  // 3. Check if max escalations reached
  if (escalationLevel >= policy.maxEscalations) {
    log.warn({ incidentId, level: escalationLevel, max: policy.maxEscalations }, "Max escalations reached");

    // Notify the team channel with @here equivalent
    if (team.discordChannelId) {
      await sendDiscordChannelAlert(team.discordChannelId, {
        id: incident.id,
        title: `⚠️ MAX ESCALATION: ${incident.title}`,
        severity: incident.severity,
        service: incident.service,
        description: `This incident has reached max escalations (${policy.maxEscalations}). Immediate attention required.`,
      });
    }

    // Log the event
    await prisma.escalationEvent.create({
      data: {
        incidentId,
        fromEngineerId: currentAssigneeId,
        toEngineerId: currentAssigneeId,
        escalationLevel,
        reason: "max_escalations_reached",
        channelUsed: "discord",
        deliveryStatus: "sent",
      },
    });
    return;
  }

  // 4. Determine next engineer from escalation chain
  let escalationChain: { role?: string; engineer_id?: string }[] = [];
  try {
    escalationChain = JSON.parse(policy.escalationChain);
  } catch {
    log.error({ teamId }, "Invalid escalation chain JSON");
    return;
  }

  let nextEngineerId: string | null = null;
  const chainEntry = escalationChain[escalationLevel - 1]; // 0-indexed

  if (chainEntry?.engineer_id) {
    nextEngineerId = chainEntry.engineer_id;
  } else if (chainEntry?.role) {
    // Find an engineer with this role in the team
    const member = team.members.find(
      (m) => m.role === chainEntry.role && m.engineerId !== currentAssigneeId
    );
    nextEngineerId = member?.engineerId || null;
  }

  // Fallback: pick next available team member
  if (!nextEngineerId) {
    const available = team.members.filter(
      (m) => m.engineerId !== currentAssigneeId && m.engineer.isActive && !m.engineer.deletedAt
    );
    nextEngineerId = available[0]?.engineerId || null;
  }

  if (!nextEngineerId) {
    log.warn({ incidentId, teamId }, "No engineer available for escalation");
    return;
  }

  // 5. Update incident assignee
  await prisma.incident.update({
    where: { id: incidentId },
    data: { assigneeId: nextEngineerId },
  });

  // 6. Log escalation event
  await prisma.escalationEvent.create({
    data: {
      incidentId,
      fromEngineerId: currentAssigneeId,
      toEngineerId: nextEngineerId,
      escalationLevel: escalationLevel + 1,
      reason: "no_ack",
      channelUsed: "discord",
      deliveryStatus: "sent",
    },
  });

  // 7. Notify next engineer
  const nextEngineer = await prisma.engineer.findUnique({ where: { id: nextEngineerId } });
  if (nextEngineer?.discordUserId) {
    await sendDiscordDM(nextEngineer.discordUserId, {
      id: incident.id,
      title: `🔺 ESCALATED [L${escalationLevel + 1}]: ${incident.title}`,
      severity: incident.severity,
      service: incident.service,
      description: `Escalated from previous assignee (no ACK within ${job.data.ackWindowSeconds}s)`,
    });
  }

  // 8. Create notification record
  await prisma.notification.create({
    data: {
      incidentId,
      engineerId: nextEngineerId,
      channel: "discord",
      messageBody: `Escalation L${escalationLevel + 1}: ${incident.title}`,
      status: "sent",
      sentAt: new Date(),
    },
  });

  // 9. Schedule next escalation timer
  const { escalationQueue: escQueue } = await import("./queues.js");
  const nextAckWindowKey = `p${incident.severity.replace("P", "")}AckWindowSeconds` as keyof typeof policy;
  const nextAckWindow = (policy[nextAckWindowKey] as number) || 300;

  if (escQueue) {
    await escQueue.add(
      `escalation:${incidentId}:L${escalationLevel + 1}`,
      {
        incidentId,
        escalationLevel: escalationLevel + 1,
        ackWindowSeconds: nextAckWindow,
        currentAssigneeId: nextEngineerId,
        teamId,
        orgId,
      },
      { delay: nextAckWindow * 1000 }
    );
  }

  log.info(
    { incidentId, from: currentAssigneeId, to: nextEngineerId, level: escalationLevel + 1 },
    "Escalation complete"
  );
}

// ── Start the worker ────────────────────────────

export function startEscalationWorker(): Worker<EscalationJobData> | null {
  const redisUrl = process.env["REDIS_URL"];
  if (!redisUrl) {
    log.warn("No REDIS_URL — escalation worker not started");
    return null;
  }

  let connection;
  try {
    const url = new URL(redisUrl);
    connection = { host: url.hostname, port: parseInt(url.port || "6379", 10), password: url.password || undefined };
  } catch {
    connection = { host: "localhost", port: 6379 };
  }

  const worker = new Worker<EscalationJobData>("maestro:escalations", processEscalation, {
    connection,
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    log.info({ jobId: job.id, incidentId: job.data.incidentId }, "Escalation job completed");
  });

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Escalation job failed");
  });

  log.info("Escalation worker started");
  return worker;
}
