// Audit Log Routes (PRD 6.x)
import { FastifyInstance } from "fastify";
import { prisma } from "../../config/database.js";
import { bearerAuth, requireRole } from "../../middleware/auth.js";
import type { AuthUser } from "../../middleware/auth.js";

export async function auditLogRoutes(app: FastifyInstance): Promise<void> {
  // Query audit log with filters (admin only)
  app.get("/audit-log", { preHandler: [bearerAuth, requireRole("lead", "manager")] }, async (request, reply) => {
    const user = (request as any).user as AuthUser;
    const { action, entityType, actorId, page, perPage } = request.query as Record<string, string | undefined>;
    const pageNum = parseInt(page || "1", 10);
    const limit = Math.min(parseInt(perPage || "50", 10), 200);

    const where: Record<string, unknown> = { orgId: user.orgId };
    if (action) where["action"] = action;
    if (entityType) where["entityType"] = entityType;
    if (actorId) where["actorId"] = actorId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return reply.send({
      items: logs,
      total,
      page: pageNum,
      perPage: limit,
      totalPages: Math.ceil(total / limit),
    });
  });
}
