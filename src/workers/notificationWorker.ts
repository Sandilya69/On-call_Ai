// ============================================
// OnCall Maestro — Notification Worker
// ============================================
// Dispatches notifications across channels (Discord, SMS, Email).

import { Worker, Job } from "bullmq";
import { prisma } from "../config/database.js";
import { sendDiscordDM } from "../integrations/discord.js";
import { logger } from "../utils/logger.js";
import type { NotificationJobData } from "./queues.js";

const log = logger.child({ component: "notification-worker" });

async function processNotification(job: Job<NotificationJobData>): Promise<void> {
  const { incidentId, engineerId, discordUserId, phone, severity, incident } = job.data;
  log.info({ incidentId, engineerId, severity }, "Processing notification");

  const channels: string[] = [];

  // 1. Discord DM (primary for all severities)
  if (discordUserId) {
    const sent = await sendDiscordDM(discordUserId, incident);
    if (sent) channels.push("discord");
    await prisma.notification.create({
      data: {
        incidentId, engineerId, channel: "discord",
        messageBody: `[${severity}] ${incident.title} — ${incident.service}`,
        status: sent ? "sent" : "failed", sentAt: sent ? new Date() : null,
      },
    });
  }

  // 2. SMS via Twilio (for P1/P2)
  if (phone && (severity === "P1" || severity === "P2")) {
    try {
      const { sendSMS } = await import("../integrations/twilio.js");
      const sent = await sendSMS(phone, incident);
      if (sent) channels.push("sms");
      await prisma.notification.create({
        data: {
          incidentId, engineerId, channel: "sms",
          messageBody: `[${severity}] ${incident.title}`,
          status: sent ? "sent" : "failed", sentAt: sent ? new Date() : null,
        },
      });
    } catch (err) {
      log.error({ err, phone }, "SMS notification failed");
    }
  }

  // 3. Voice call via Twilio (P1 only — critical incidents get a phone call)
  if (phone && severity === "P1") {
    try {
      const { placeVoiceCall } = await import("../integrations/twilio.js");
      const result = await placeVoiceCall(phone, incident);
      if (result.success) channels.push("voice");
      await prisma.notification.create({
        data: {
          incidentId, engineerId, channel: "voice",
          messageBody: `[P1 VOICE CALL] ${incident.title}`,
          externalMessageId: result.callSid || null,
          status: result.success ? "sent" : "failed",
          sentAt: result.success ? new Date() : null,
        },
      });
    } catch (err) {
      log.error({ err, phone }, "Voice call notification failed");
    }
  }

  log.info({ incidentId, channels }, "Notification dispatched");
}

export function startNotificationWorker(): Worker<NotificationJobData> | null {
  const redisUrl = process.env["REDIS_URL"];
  if (!redisUrl) {
    log.warn("No REDIS_URL — notification worker not started");
    return null;
  }

  let connection;
  try {
    const url = new URL(redisUrl);
    connection = { host: url.hostname, port: parseInt(url.port || "6379", 10), password: url.password || undefined };
  } catch {
    connection = { host: "localhost", port: 6379 };
  }

  const worker = new Worker<NotificationJobData>("maestro:notifications", processNotification, {
    connection,
    concurrency: 10,
  });

  worker.on("completed", (job) => log.info({ jobId: job.id }, "Notification job completed"));
  worker.on("failed", (job, err) => log.error({ jobId: job?.id, err }, "Notification job failed"));

  log.info("Notification worker started");
  return worker;
}
