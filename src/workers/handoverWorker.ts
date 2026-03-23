// ============================================
// OnCall Maestro — Handover Briefing Worker
// ============================================
// Processes handover jobs: Claude generates briefing →
// Whisper TTS creates audio → Discord delivers to incoming engineer.

import { Worker, Job } from "bullmq";
import { prisma } from "../config/database.js";
import { routeWithClaude } from "../integrations/claude.js";
import { generateSpeech, buildHandoverPrompt, HANDOVER_SYSTEM_PROMPT } from "../integrations/whisper.js";
import { sendHandoverBriefing } from "../integrations/discord.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";
import type { HandoverJobData } from "./queues.js";
import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";

const log = logger.child({ component: "handover-worker" });

async function processHandover(job: Job<HandoverJobData>): Promise<void> {
  const { shiftId, teamId, outgoingEngineerId, incomingEngineerId } = job.data;
  log.info({ shiftId, teamId }, "Processing handover briefing");

  // 1. Fetch all context
  const [shift, team, outgoing, incoming] = await Promise.all([
    prisma.rota.findUnique({ where: { id: shiftId } }),
    prisma.team.findUnique({ where: { id: teamId } }),
    prisma.engineer.findUnique({ where: { id: outgoingEngineerId } }),
    prisma.engineer.findUnique({ where: { id: incomingEngineerId } }),
  ]);

  if (!shift || !team || !outgoing || !incoming) {
    log.warn({ shiftId, teamId }, "Missing data for handover — skipping");
    return;
  }

  // 2. Gather incident data for the briefing
  const openIncidents = await prisma.incident.findMany({
    where: { teamId, status: { in: ["open", "acknowledged"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const resolvedThisShift = await prisma.incident.findMany({
    where: {
      teamId,
      status: "resolved",
      resolvedAt: { gte: shift.startTime },
    },
    orderBy: { resolvedAt: "desc" },
    take: 10,
  });

  // 3. Build Claude prompt
  const promptContext = {
    outgoingName: outgoing.name,
    incomingName: incoming.name,
    teamName: team.name,
    shiftStart: shift.startTime.toISOString(),
    shiftEnd: shift.endTime.toISOString(),
    openIncidents: openIncidents.map((i) => ({
      severity: i.severity,
      title: i.title,
      durationMinutes: Math.round((Date.now() - i.createdAt.getTime()) / 60000),
      lastAction: i.status === "acknowledged" ? "Acknowledged" : "Open — awaiting response",
    })),
    resolvedThisShift: resolvedThisShift.map((i) => ({
      title: i.title,
      resolutionNotes: i.resolutionNotes || "No notes",
    })),
    watchServices: [] as string[], // TODO: compute from elevated error rates
  };

  const userPrompt = buildHandoverPrompt(promptContext);

  // 4. Generate briefing text via Claude
  let briefingText = "";
  try {
    if (env.ANTHROPIC_API_KEY) {
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: env.ANTHROPIC_MODEL,
        max_tokens: 500,
        system: HANDOVER_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });
      briefingText = response.content[0]?.type === "text" ? response.content[0].text : "";
    }
  } catch (err) {
    log.error({ err }, "Claude briefing generation failed");
  }

  // Fallback if Claude is unavailable
  if (!briefingText) {
    briefingText = `Handover briefing for ${team.name}. ` +
      `${outgoing.name} handing over to ${incoming.name}. ` +
      `There are ${openIncidents.length} open incidents. ` +
      `${resolvedThisShift.length} incidents were resolved this shift.`;
  }

  // 5. Generate TTS audio
  let audioUrl: string | undefined;
  let audioDuration = 0;
  try {
    const outputDir = path.resolve("storage/handovers");
    const ttsResult = await generateSpeech(briefingText, outputDir);
    audioUrl = ttsResult.filePath;
    audioDuration = ttsResult.durationEstimate;
  } catch (err) {
    log.error({ err }, "TTS generation failed — continuing without audio");
  }

  // 6. Store handover record
  const handover = await prisma.handover.create({
    data: {
      teamId,
      outgoingEngineerId,
      incomingEngineerId,
      shiftId,
      briefingText,
      audioUrl: audioUrl || null,
      audioDurationSeconds: audioDuration || null,
      openIncidentsCount: openIncidents.length,
      resolvedThisShift: resolvedThisShift.length,
      deliveryStatus: "pending",
    },
  });

  // 7. Deliver via Discord DM to incoming engineer
  let delivered = false;
  if (incoming.discordUserId) {
    delivered = await sendHandoverBriefing(incoming.discordUserId, briefingText, audioUrl);
  }

  // 8. Update delivery status
  await prisma.handover.update({
    where: { id: handover.id },
    data: {
      deliveryStatus: delivered ? "delivered" : "failed",
      deliveredAt: delivered ? new Date() : null,
    },
  });

  // 9. Audit log
  await prisma.auditLog.create({
    data: {
      orgId: team.orgId,
      actorType: "system",
      action: "handover.generated",
      entityType: "handover",
      entityId: handover.id,
      metadata: JSON.stringify({
        teamId,
        shiftId,
        outgoing: outgoing.name,
        incoming: incoming.name,
        hasAudio: !!audioUrl,
        delivered,
      }),
    },
  });

  log.info(
    { handoverId: handover.id, delivered, hasAudio: !!audioUrl },
    "Handover briefing complete"
  );
}

// ── Start the worker ────────────────────────────

export function startHandoverWorker(): Worker<HandoverJobData> | null {
  const redisUrl = process.env["REDIS_URL"];
  if (!redisUrl) {
    log.warn("No REDIS_URL — handover worker not started");
    return null;
  }

  let connection;
  try {
    const url = new URL(redisUrl);
    connection = {
      host: url.hostname,
      port: parseInt(url.port || "6379", 10),
      password: url.password || undefined,
    };
  } catch {
    connection = { host: "localhost", port: 6379 };
  }

  const worker = new Worker<HandoverJobData>("maestro:handovers", processHandover, {
    connection,
    concurrency: 3,
  });

  worker.on("completed", (job) => {
    log.info({ jobId: job.id, shiftId: job.data.shiftId }, "Handover job completed");
  });

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Handover job failed");
  });

  log.info("Handover worker started");
  return worker;
}
