// ============================================
// OnCall Maestro — Alert Processing Worker
// ============================================
// Async processing of ingested alerts:
// AI routing → notification dispatch → escalation timer start.

import { Worker, Job } from "bullmq";
import { prisma } from "../config/database.js";
import { routeWithClaude } from "../integrations/claude.js";
import { notificationQueue, escalationQueue } from "./queues.js";
import { logger } from "../utils/logger.js";
import type { AlertJobData } from "./queues.js";

const log = logger.child({ component: "alert-worker" });

async function processAlert(job: Job<AlertJobData>): Promise<void> {
  const { incidentId, orgId, severity, service } = job.data;
  log.info({ incidentId, severity, service }, "Processing alert");

  // 1. Fetch incident & on-call engineers
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident || incident.status !== "open") {
    log.info({ incidentId, status: incident?.status }, "Incident not open — skipping");
    return;
  }

  // Get team and its on-call engineers
  const team = incident.teamId
    ? await prisma.team.findUnique({
        where: { id: incident.teamId },
        include: {
          members: { include: { engineer: true } },
          escalationPolicy: true,
        },
      })
    : null;

  const engineers = team?.members
    .map((m) => m.engineer)
    .filter((e) => e.isActive && !e.deletedAt) || [];

  // 2. AI Routing
  const now = new Date();
  const engineerContexts = engineers.map((e) => {
    const skills: string[] = JSON.parse(e.skillTags || "[]");
    const tz = e.timezone || "UTC";
    const hour = parseInt(
      now.toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false })
    );
    const workStart = parseInt(e.workingHoursStart.split(":")[0] || "9");
    const workEnd = parseInt(e.workingHoursEnd.split(":")[0] || "18");
    return {
      id: e.id,
      name: e.name,
      skills,
      timezone: tz,
      isWorkingHours: hour >= workStart && hour < workEnd,
      recentIncidentsResolved: 0, // TODO: could query recent resolved count
    };
  });

  // Recent incidents for context
  const recentIncidents = await prisma.incident.findMany({
    where: { service, orgId, status: "resolved" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { title: true, severity: true, resolutionNotes: true },
  });
  const recentStrings = recentIncidents.map(
    (i) => `[${i.severity}] ${i.title} — ${i.resolutionNotes || "no notes"}`
  );

  const routing = await routeWithClaude(
    {
      title: incident.title,
      severity: incident.severity,
      service: incident.service,
      description: incident.description || undefined,
      labels: JSON.parse(incident.labels || "{}"),
    },
    engineerContexts,
    recentStrings
  );

  // 3. Update incident with routing result
  if (routing.assigneeId) {
    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        assigneeId: routing.assigneeId,
        routedBy: routing.routedBy,
        routingRationale: routing.rationale,
      },
    });
  }

  // 4. Dispatch notifications
  if (routing.assigneeId && notificationQueue) {
    const assignee = await prisma.engineer.findUnique({ where: { id: routing.assigneeId } });
    if (assignee) {
      await notificationQueue.add(`notify:${incidentId}`, {
        incidentId,
        engineerId: assignee.id,
        discordUserId: assignee.discordUserId || undefined,
        phone: assignee.phone || undefined,
        severity: incident.severity,
        incident: {
          id: incident.id,
          title: incident.title,
          severity: incident.severity,
          service: incident.service,
          description: incident.description,
        },
      });
    }
  }

  // 5. Start escalation timer
  if (routing.assigneeId && escalationQueue && team?.escalationPolicy) {
    const policy = team.escalationPolicy;
    const ackWindowKey = `p${severity.replace("P", "")}AckWindowSeconds` as keyof typeof policy;
    const ackWindow = (policy[ackWindowKey] as number) || 300;

    await escalationQueue.add(
      `escalation:${incidentId}:L1`,
      {
        incidentId,
        escalationLevel: 1,
        ackWindowSeconds: ackWindow,
        currentAssigneeId: routing.assigneeId,
        teamId: team.id,
        orgId,
      },
      { delay: ackWindow * 1000 }
    );

    // Store job ID on incident for potential cancellation on ACK
    log.info({ incidentId, ackWindow }, "Escalation timer started");
  }

  // 6. Log escalation event (level 1 = first notification)
  if (routing.assigneeId) {
    await prisma.escalationEvent.create({
      data: {
        incidentId,
        toEngineerId: routing.assigneeId,
        escalationLevel: 1,
        reason: "initial_assignment",
        channelUsed: "discord",
        deliveryStatus: "sent",
      },
    });
  }

  log.info({ incidentId, assigneeId: routing.assigneeId, routedBy: routing.routedBy }, "Alert processing complete");
}

export function startAlertWorker(): Worker<AlertJobData> | null {
  const redisUrl = process.env["REDIS_URL"];
  if (!redisUrl) {
    log.warn("No REDIS_URL — alert worker not started");
    return null;
  }

  let connection;
  try {
    const url = new URL(redisUrl);
    connection = { host: url.hostname, port: parseInt(url.port || "6379", 10), password: url.password || undefined };
  } catch {
    connection = { host: "localhost", port: 6379 };
  }

  const worker = new Worker<AlertJobData>("maestro:alerts", processAlert, {
    connection,
    concurrency: 5,
  });

  worker.on("completed", (job) => log.info({ jobId: job.id }, "Alert job completed"));
  worker.on("failed", (job, err) => log.error({ jobId: job?.id, err }, "Alert job failed"));

  log.info("Alert worker started");
  return worker;
}
