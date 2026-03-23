// Rota Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database.js";
import { bearerAuth, requireRole } from "../../middleware/auth.js";
import type { AuthUser } from "../../middleware/auth.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

const log = logger.child({ component: "rota" });

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user as AuthUser;
}

export async function rotaRoutes(app: FastifyInstance): Promise<void> {
  app.get("/rota", { preHandler: [bearerAuth] }, async (request, reply) => {
    const { teamId } = request.query as { teamId?: string };
    const where: Record<string, unknown> = {};
    if (teamId) where["teamId"] = teamId;
    const rota = await prisma.rota.findMany({ where, include: { engineer: true, team: true }, orderBy: { startTime: "asc" } });
    return reply.send({ items: rota, total: rota.length });
  });

  // On-demand rota generation (PRD 5.5)
  app.post("/rota/generate", { preHandler: [bearerAuth, requireRole("lead", "manager")] }, async (request, reply) => {
    const user = getUser(request);
    const b = request.body as { teamId: string; weekStart: string; weekEnd: string };
    const team = await prisma.team.findUnique({ where: { id: b.teamId }, include: { members: { include: { engineer: true } } } });
    if (!team) throw new NotFoundError("Team", b.teamId);

    const active = team.members.map((m) => m.engineer).filter((e) => e.isActive && !e.deletedAt);
    if (active.length === 0) return reply.status(400).send({ error: "No active engineers" });

    // Check for existing rota in this window
    const existing = await prisma.rota.findFirst({
      where: {
        teamId: team.id,
        startTime: { gte: new Date(b.weekStart) },
        endTime: { lte: new Date(b.weekEnd) },
      },
    });
    if (existing) return reply.status(409).send({ error: "Rota already exists for this period" });

    // Filter engineers by availability
    const weekStart = new Date(b.weekStart);
    const weekEnd = new Date(b.weekEnd);
    const unavailable = await prisma.availability.findMany({
      where: {
        engineerId: { in: active.map((e) => e.id) },
        unavailableFrom: { lte: weekEnd },
        unavailableTo: { gte: weekStart },
        approved: true,
      },
    });
    const unavailableIds = new Set(unavailable.map((a) => a.engineerId));
    const available = active.filter((e) => !unavailableIds.has(e.id));

    if (available.length === 0) {
      return reply.status(400).send({ error: "No engineers available for the requested period" });
    }

    const shifts = [];
    let current = weekStart.getTime();
    const end = weekEnd.getTime();
    const shiftMs = 8 * 3600 * 1000;
    let idx = 0;
    while (current < end) {
      const eng = available[idx % available.length]!;
      const shift = await prisma.rota.create({
        data: {
          teamId: team.id, engineerId: eng.id,
          startTime: new Date(current), endTime: new Date(current + shiftMs),
          shiftType: "primary", status: "scheduled", generatedBy: "system",
        },
      });
      shifts.push(shift);
      current += shiftMs;
      idx++;
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId: user.orgId, actorId: user.engineerId, actorType: "engineer",
        action: "rota.generated", entityType: "rota",
        metadata: JSON.stringify({ teamId: team.id, weekStart: b.weekStart, shiftCount: shifts.length }),
      },
    });

    log.info({ teamId: team.id, shifts: shifts.length }, "Rota generated on-demand");
    return reply.status(201).send({ message: `Generated ${shifts.length} shifts`, shifts });
  });

  // Swap request (PRD 5.6)
  app.post("/rota/swap", { preHandler: [bearerAuth] }, async (request, reply) => {
    const user = getUser(request);
    const b = request.body as { shiftId: string; targetEngineerId: string; reason?: string };

    // 1. Find the shift
    const shift = await prisma.rota.findUnique({
      where: { id: b.shiftId },
      include: { engineer: true, team: true },
    });
    if (!shift) throw new NotFoundError("Shift", b.shiftId);

    // 2. Find target engineer
    const targetEngineer = await prisma.engineer.findUnique({ where: { id: b.targetEngineerId } });
    if (!targetEngineer || !targetEngineer.isActive) {
      throw new ValidationError("Target engineer not found or inactive");
    }

    // 3. Check target engineer's availability
    const conflict = await prisma.availability.findFirst({
      where: {
        engineerId: b.targetEngineerId,
        unavailableFrom: { lte: shift.endTime },
        unavailableTo: { gte: shift.startTime },
        approved: true,
      },
    });
    if (conflict) {
      return reply.status(409).send({
        error: "Conflict",
        message: `${targetEngineer.name} is unavailable during this shift (${conflict.reason || "no reason"})`,
      });
    }

    // 4. Check max shifts per week for target engineer
    const weekStart = new Date(shift.startTime);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1); // Monday
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const targetShiftCount = await prisma.rota.count({
      where: {
        engineerId: b.targetEngineerId,
        startTime: { gte: weekStart },
        endTime: { lte: weekEnd },
        status: { not: "cancelled" },
      },
    });
    if (targetShiftCount >= targetEngineer.maxShiftsPerWeek) {
      return reply.status(409).send({
        error: "Max shifts exceeded",
        message: `${targetEngineer.name} already has ${targetShiftCount}/${targetEngineer.maxShiftsPerWeek} shifts this week`,
      });
    }

    // 5. Auto-approve if no conflicts and >24h notice
    const hoursUntilShift = (shift.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    const autoApprove = hoursUntilShift > 24;

    if (!autoApprove) {
      // Flag for manual approval (for now just warn)
      log.warn({ shiftId: b.shiftId, hoursUntilShift }, "Swap requires manual approval (< 24h notice)");
    }

    // 6. Perform swap
    const updated = await prisma.rota.update({
      where: { id: b.shiftId },
      data: {
        engineerId: b.targetEngineerId,
        generatedBy: "swap",
        notes: b.reason || `Swapped from ${shift.engineer.name} to ${targetEngineer.name}`,
        status: "swapped",
      },
      include: { engineer: true },
    });

    // 7. Audit log
    await prisma.auditLog.create({
      data: {
        orgId: user.orgId, actorId: user.engineerId, actorType: "engineer",
        action: "rota.swap_approved", entityType: "rota", entityId: b.shiftId,
        metadata: JSON.stringify({
          fromEngineerId: shift.engineerId,
          toEngineerId: b.targetEngineerId,
          autoApproved: autoApprove,
          reason: b.reason,
        }),
      },
    });

    log.info({
      shiftId: b.shiftId,
      from: shift.engineer.name,
      to: targetEngineer.name,
      autoApproved: autoApprove,
    }, "Rota swap completed");

    return reply.send({
      message: autoApprove ? "Swap approved automatically" : "Swap completed (manual review recommended)",
      autoApproved: autoApprove,
      shift: updated,
    });
  });
}

