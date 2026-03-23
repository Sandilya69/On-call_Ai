// ============================================
// OnCall Maestro — BullMQ Queues (PRD 7.4)
// ============================================
// Defines all queues and job types for async processing.

import { Queue, QueueEvents } from "bullmq";
import { logger } from "../utils/logger.js";

const log = logger.child({ component: "queues" });

// ── Redis connection config ─────────────────────
function getRedisConnection() {
  const redisUrl = process.env["REDIS_URL"];
  if (!redisUrl) {
    log.warn("No REDIS_URL — BullMQ queues will not be created");
    return null;
  }
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port || "6379", 10),
      password: url.password || undefined,
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

const connection = getRedisConnection();

// ── Queue definitions ───────────────────────────

/**
 * ALERT_QUEUE: Processes incoming alerts.
 * Jobs: { incidentId, orgId, payload }
 */
export const alertQueue = connection
  ? new Queue("maestro:alerts", { connection, defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 1000 }, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } } })
  : null;

/**
 * NOTIFICATION_QUEUE: Dispatches notifications across channels.
 * Jobs: { incidentId, engineerId, channels, incident }
 */
export const notificationQueue = connection
  ? new Queue("maestro:notifications", { connection, defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 500 }, removeOnComplete: { count: 2000 }, removeOnFail: { count: 5000 } } })
  : null;

/**
 * ESCALATION_QUEUE: Manages escalation timers.
 * Jobs: { incidentId, escalationLevel, ackWindowSeconds }
 */
export const escalationQueue = connection
  ? new Queue("maestro:escalations", { connection, defaultJobOptions: { attempts: 2, removeOnComplete: { count: 1000 }, removeOnFail: { count: 2000 } } })
  : null;

/**
 * HANDOVER_QUEUE: Generates handover briefings.
 * Jobs: { shiftId, teamId, outgoingEngineerId, incomingEngineerId }
 */
export const handoverQueue = connection
  ? new Queue("maestro:handovers", { connection, defaultJobOptions: { attempts: 2, removeOnComplete: { count: 500 }, removeOnFail: { count: 1000 } } })
  : null;

// ── Job type definitions ────────────────────────

export interface AlertJobData {
  incidentId: string;
  orgId: string;
  severity: string;
  service: string;
}

export interface NotificationJobData {
  incidentId: string;
  engineerId: string;
  discordUserId?: string;
  discordChannelId?: string;
  phone?: string;
  email?: string;
  severity: string;
  incident: {
    id: string;
    title: string;
    severity: string;
    service: string;
    description?: string | null;
  };
}

export interface EscalationJobData {
  incidentId: string;
  escalationLevel: number;
  ackWindowSeconds: number;
  currentAssigneeId: string;
  teamId: string;
  orgId: string;
}

export interface HandoverJobData {
  shiftId: string;
  teamId: string;
  outgoingEngineerId: string;
  incomingEngineerId: string;
}

// ── Queue health check ──────────────────────────

export async function getQueueHealth(): Promise<Record<string, { waiting: number; active: number; failed: number }>> {
  const result: Record<string, { waiting: number; active: number; failed: number }> = {};

  for (const [name, queue] of Object.entries({ alerts: alertQueue, notifications: notificationQueue, escalations: escalationQueue, handovers: handoverQueue })) {
    if (queue) {
      const counts = await queue.getJobCounts("waiting", "active", "failed");
      result[name] = { waiting: counts.waiting || 0, active: counts.active || 0, failed: counts.failed || 0 };
    }
  }

  return result;
}

// ── Graceful shutdown ───────────────────────────

export async function closeQueues(): Promise<void> {
  const queues = [alertQueue, notificationQueue, escalationQueue, handoverQueue].filter(Boolean) as Queue[];
  await Promise.all(queues.map((q) => q.close()));
  log.info("All BullMQ queues closed");
}
