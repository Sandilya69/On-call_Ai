// ============================================
// OnCall Maestro — Availability Routes
// ============================================
// Engineers declare when they are NOT available for on-call shifts.

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database.js";
import { bearerAuth } from "../../middleware/auth.js";
import type { AuthUser } from "../../middleware/auth.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";

const log = logger.child({ component: "availability" });

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user as AuthUser;
}

export async function availabilityRoutes(app: FastifyInstance): Promise<void> {
  // List availability for an engineer
  app.get("/availability", { preHandler: [bearerAuth] }, async (request, reply) => {
    const user = getUser(request);
    const { engineerId } = request.query as { engineerId?: string };
    const targetId = engineerId || user.engineerId;

    const items = await prisma.availability.findMany({
      where: { engineerId: targetId },
      orderBy: { unavailableFrom: "asc" },
      include: { engineer: { select: { id: true, name: true } } },
    });

    return reply.send({ items, total: items.length });
  });

  // Create availability block (engineer sets their own unavailability)
  app.post("/availability", { preHandler: [bearerAuth] }, async (request, reply) => {
    const user = getUser(request);
    const body = request.body as {
      unavailableFrom: string;
      unavailableTo: string;
      reason?: string;
      engineerId?: string; // leads/managers can set for others
    };

    const targetEngineerId = body.engineerId || user.engineerId;

    // Validate dates
    const from = new Date(body.unavailableFrom);
    const to = new Date(body.unavailableTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new ValidationError("Invalid date format");
    }
    if (to <= from) {
      throw new ValidationError("unavailableTo must be after unavailableFrom");
    }

    const availability = await prisma.availability.create({
      data: {
        engineerId: targetEngineerId,
        unavailableFrom: from,
        unavailableTo: to,
        reason: body.reason || null,
        approved: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId: user.orgId,
        actorId: user.engineerId,
        actorType: "engineer",
        action: "availability.created",
        entityType: "availability",
        entityId: availability.id,
        metadata: JSON.stringify({
          engineerId: targetEngineerId,
          from: from.toISOString(),
          to: to.toISOString(),
          reason: body.reason,
        }),
      },
    });

    log.info({ id: availability.id, engineerId: targetEngineerId }, "Availability block created");
    return reply.status(201).send(availability);
  });

  // Delete availability block
  app.delete("/availability/:id", { preHandler: [bearerAuth] }, async (request, reply) => {
    const user = getUser(request);
    const { id } = request.params as { id: string };

    const existing = await prisma.availability.findUnique({
      where: { id },
      include: { engineer: true },
    });
    if (!existing) throw new NotFoundError("Availability", id);

    // Only the engineer themselves or a lead/manager can delete
    if (existing.engineerId !== user.engineerId && !["lead", "manager"].includes(user.role)) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    await prisma.availability.delete({ where: { id } });

    log.info({ id, engineerId: existing.engineerId }, "Availability block deleted");
    return reply.send({ message: "Availability block deleted" });
  });
}
