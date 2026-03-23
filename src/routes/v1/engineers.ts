// Engineer Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database.js";
import { bearerAuth, requireRole } from "../../middleware/auth.js";
import type { AuthUser } from "../../middleware/auth.js";
import { NotFoundError } from "../../utils/errors.js";

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user as AuthUser;
}

export async function engineerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/engineers", { preHandler: [bearerAuth] }, async (request, reply) => {
    const user = getUser(request);
    const engineers = await prisma.engineer.findMany({ where: { orgId: user.orgId, deletedAt: null }, orderBy: { name: "asc" } });
    return reply.send({ items: engineers, total: engineers.length });
  });

  app.post("/engineers", { preHandler: [bearerAuth, requireRole("lead", "manager")] }, async (request, reply) => {
    const user = getUser(request);
    const b = request.body as any;
    const engineer = await prisma.engineer.create({
      data: { orgId: user.orgId, name: b.name, email: b.email, phone: b.phone, discordUserId: b.discordUserId,
        timezone: b.timezone || "UTC", skillTags: JSON.stringify(b.skillTags || []),
        workingHoursStart: b.workingHoursStart || "09:00", workingHoursEnd: b.workingHoursEnd || "18:00",
        maxShiftsPerWeek: b.maxShiftsPerWeek || 3, notificationPrefs: JSON.stringify(b.notificationPrefs || {}) },
    });
    return reply.status(201).send(engineer);
  });

  app.patch("/engineers/:id", { preHandler: [bearerAuth] }, async (request, reply) => {
    const user = getUser(request);
    const { id } = request.params as { id: string };
    const engineer = await prisma.engineer.findFirst({ where: { id, orgId: user.orgId, deletedAt: null } });
    if (!engineer) throw new NotFoundError("Engineer", id);
    const b = request.body as Record<string, any>;
    const updated = await prisma.engineer.update({ where: { id }, data: {
      ...(b.name && { name: b.name }), ...(b.phone !== undefined && { phone: b.phone }),
      ...(b.timezone && { timezone: b.timezone }), ...(b.isActive !== undefined && { isActive: b.isActive }),
      ...(b.discordUserId !== undefined && { discordUserId: b.discordUserId }),
    }});
    return reply.send(updated);
  });
}
