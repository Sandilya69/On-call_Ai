// ============================================
// OnCall Maestro — Cron Jobs (PRD 7.7)
// ============================================
// Periodic tasks: handover briefing checks,
// rota generation triggers, orphaned timer recovery.

import { Cron } from "croner";
import { prisma } from "../config/database.js";
import { handoverQueue } from "../workers/queues.js";
import { logger } from "../utils/logger.js";

const log = logger.child({ component: "cron" });

const activeJobs: Cron[] = [];

/**
 * Start all cron jobs.
 * Call this after the server is running.
 */
export function startCronJobs(): void {
  log.info("Starting cron jobs...");

  // ── Check upcoming handovers — every 5 minutes ─
  // PRD 5.4: Celery Beat runs check_upcoming_handovers every 5 minutes.
  const handoverCheck = new Cron("*/5 * * * *", async () => {
    try {
      await checkUpcomingHandovers();
    } catch (err) {
      log.error({ err }, "Handover check cron failed");
    }
  });
  activeJobs.push(handoverCheck);
  log.info("  ✓ Handover check cron (every 5 min)");

  // ── Rota generation — Sunday 18:00 UTC ──────────
  // PRD 5.5: Runs every Sunday at 18:00 UTC for the following week.
  const rotaGen = new Cron("0 18 * * 0", async () => {
    try {
      await triggerRotaGeneration();
    } catch (err) {
      log.error({ err }, "Rota generation cron failed");
    }
  });
  activeJobs.push(rotaGen);
  log.info("  ✓ Rota generation cron (Sunday 18:00 UTC)");

  // ── Orphaned escalation recovery — every 2 minutes ─
  const orphanRecovery = new Cron("*/2 * * * *", async () => {
    try {
      await recoverOrphanedEscalations();
    } catch (err) {
      log.error({ err }, "Orphan recovery cron failed");
    }
  });
  activeJobs.push(orphanRecovery);
  log.info("  ✓ Orphan escalation recovery cron (every 2 min)");

  log.info(`${activeJobs.length} cron jobs started`);
}

/**
 * Check for shifts ending in the next 10-15 minutes.
 * Queue a handover briefing job for each.
 */
async function checkUpcomingHandovers(): Promise<void> {
  const now = new Date();
  const tenMinLater = new Date(now.getTime() + 10 * 60 * 1000);
  const fifteenMinLater = new Date(now.getTime() + 15 * 60 * 1000);

  const endingShifts = await prisma.rota.findMany({
    where: {
      endTime: { gte: tenMinLater, lte: fifteenMinLater },
      status: { in: ["scheduled", "active"] },
    },
    include: { team: true, engineer: true },
  });

  if (endingShifts.length === 0) return;

  log.info({ count: endingShifts.length }, "Found shifts ending soon");

  for (const shift of endingShifts) {
    // Find the incoming engineer (next shift)
    const nextShift = await prisma.rota.findFirst({
      where: {
        teamId: shift.teamId,
        startTime: { gte: shift.endTime },
        status: { in: ["scheduled", "active"] },
      },
      orderBy: { startTime: "asc" },
      include: { engineer: true },
    });

    if (!nextShift) {
      log.warn({ shiftId: shift.id, teamId: shift.teamId }, "No incoming shift found");
      continue;
    }

    // Check if handover already exists
    const existing = await prisma.handover.findFirst({
      where: { shiftId: shift.id },
    });
    if (existing) continue;

    // Queue handover generation
    if (handoverQueue) {
      await handoverQueue.add(`handover:${shift.id}`, {
        shiftId: shift.id,
        teamId: shift.teamId,
        outgoingEngineerId: shift.engineerId,
        incomingEngineerId: nextShift.engineerId,
      });
      log.info(
        { shiftId: shift.id, outgoing: shift.engineer.name, incoming: nextShift.engineer.name },
        "Handover job queued"
      );
    }
  }
}

/**
 * Auto-generate rota for all teams for the next week.
 */
async function triggerRotaGeneration(): Promise<void> {
  const teams = await prisma.team.findMany({
    where: { deletedAt: null },
    include: { members: { include: { engineer: true } } },
  });

  const nextMonday = getNextMonday();
  const nextSunday = new Date(nextMonday.getTime() + 7 * 24 * 60 * 60 * 1000);

  for (const team of teams) {
    const active = team.members
      .map((m) => m.engineer)
      .filter((e) => e.isActive && !e.deletedAt);

    if (active.length === 0) {
      log.warn({ teamId: team.id, teamName: team.name }, "No active engineers — skipping rota");
      continue;
    }

    // Check if rota already exists for this week
    const existing = await prisma.rota.findFirst({
      where: {
        teamId: team.id,
        startTime: { gte: nextMonday },
        endTime: { lte: nextSunday },
      },
    });
    if (existing) continue;

    // Simple greedy assignment: 8-hour shifts, round-robin
    const shiftMs = 8 * 60 * 60 * 1000;
    let current = nextMonday.getTime();
    let idx = 0;

    while (current < nextSunday.getTime()) {
      const eng = active[idx % active.length]!;
      await prisma.rota.create({
        data: {
          teamId: team.id,
          engineerId: eng.id,
          startTime: new Date(current),
          endTime: new Date(current + shiftMs),
          shiftType: "primary",
          status: "scheduled",
          generatedBy: "system",
        },
      });
      current += shiftMs;
      idx++;
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId: team.orgId,
        actorType: "system",
        action: "rota.generated",
        entityType: "rota",
        metadata: JSON.stringify({
          teamId: team.id,
          weekStart: nextMonday.toISOString(),
          engineerCount: active.length,
        }),
      },
    });

    log.info({ teamId: team.id, teamName: team.name }, "Rota generated for next week");
  }
}

/**
 * Recover orphaned escalations — incidents that are open
 * with no active escalation timer.
 */
async function recoverOrphanedEscalations(): Promise<void> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const orphaned = await prisma.incident.findMany({
    where: {
      status: "open",
      assigneeId: { not: null },
      createdAt: { lt: fiveMinAgo },
    },
    take: 10,
  });

  // For now just log — full implementation would re-queue escalation jobs
  if (orphaned.length > 0) {
    log.warn({ count: orphaned.length }, "Found potentially orphaned open incidents");
  }
}

/**
 * Get the next Monday at 00:00 UTC.
 */
function getNextMonday(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Stop all cron jobs.
 */
export function stopCronJobs(): void {
  for (const job of activeJobs) {
    job.stop();
  }
  activeJobs.length = 0;
  log.info("All cron jobs stopped");
}
