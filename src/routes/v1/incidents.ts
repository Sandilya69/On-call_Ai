// Incident Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database.js";
import { bearerAuth } from "../../middleware/auth.js";
import type { AuthUser } from "../../middleware/auth.js";
import { setAckState } from "../../services/dedup.js";
import { NotFoundError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
const log = logger.child({ component: "incidents" });

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user as AuthUser;
}

export async function incidentRoutes(app: FastifyInstance): Promise<void> {
  // List incidents
  app.get("/incidents", { preHandler: [bearerAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    const { status, severity, service, page, perPage } = request.query as Record<string, string | undefined>;
    const pageNum = parseInt(page || "1", 10);
    const limit = Math.min(parseInt(perPage || "25", 10), 100);
    const where: Record<string, unknown> = { orgId: user.orgId };
    if (status) where["status"] = status;
    if (severity) where["severity"] = severity;
    if (service) where["service"] = service;

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({ where, orderBy: { createdAt: "desc" }, skip: (pageNum - 1) * limit, take: limit, include: { assignee: true } }),
      prisma.incident.count({ where }),
    ]);
    return reply.send({ items: incidents, total, page: pageNum, perPage: limit, totalPages: Math.ceil(total / limit) });
  });

  // Get single incident
  app.get("/incidents/:id", { preHandler: [bearerAuth] }, async (request, reply) => {
    const user = getUser(request);
    const { id } = request.params as { id: string };
    const incident = await prisma.incident.findFirst({
      where: { id, orgId: user.orgId },
      include: { assignee: true, escalationEvents: { include: { fromEngineer: true, toEngineer: true }, orderBy: { createdAt: "desc" } }, notifications: { orderBy: { createdAt: "desc" } } },
    });
    if (!incident) throw new NotFoundError("Incident", id);
    return reply.send(incident);
  });

  // ACK incident
  app.patch("/incidents/:id/ack", { preHandler: [bearerAuth] }, async (request, reply) => {
    const user = getUser(request);
    const { id } = request.params as { id: string };
    const incident = await prisma.incident.findFirst({ where: { id, orgId: user.orgId } });
    if (!incident) throw new NotFoundError("Incident", id);
    if (incident.status === "acknowledged" || incident.status === "resolved") {
      return reply.send({ message: `Already ${incident.status}`, incident });
    }
    await setAckState(id, user.engineerId);
    const updated = await prisma.incident.update({ where: { id }, data: { status: "acknowledged", acknowledgedAt: new Date(), assigneeId: user.engineerId } });
    await prisma.auditLog.create({
      data: { orgId: user.orgId, actorId: user.engineerId, actorType: "engineer", action: "incident.acknowledged", entityType: "incident", entityId: id, metadata: JSON.stringify({ severity: incident.severity, timeToAckMs: Date.now() - incident.createdAt.getTime() }) },
    });
    log.info({ incidentId: id, engineerId: user.engineerId }, "Incident acknowledged");
    return reply.send({ message: "Incident acknowledged", incident: updated });
  });

  // Resolve incident
  app.patch("/incidents/:id/resolve", { preHandler: [bearerAuth] }, async (request, reply) => {
    const user = getUser(request);
    const { id } = request.params as { id: string };
    const body = (request.body || {}) as { resolutionNotes?: string };
    const incident = await prisma.incident.findFirst({ where: { id, orgId: user.orgId } });
    if (!incident) throw new NotFoundError("Incident", id);
    const updated = await prisma.incident.update({ where: { id }, data: { status: "resolved", resolvedAt: new Date(), resolutionNotes: body.resolutionNotes, assigneeId: user.engineerId } });
    await prisma.auditLog.create({
      data: { orgId: user.orgId, actorId: user.engineerId, actorType: "engineer", action: "incident.resolved", entityType: "incident", entityId: id, metadata: JSON.stringify({ mttrMs: Date.now() - incident.createdAt.getTime() }) },
    });
    log.info({ incidentId: id }, "Incident resolved");
    return reply.send({ message: "Incident resolved", incident: updated });
  });
}
