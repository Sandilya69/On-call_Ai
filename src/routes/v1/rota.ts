// Rota Routes
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database.js";
import { bearerAuth, requireRole } from "../../middleware/auth.js";
import { NotFoundError } from "../../utils/errors.js";

export async function rotaRoutes(app: FastifyInstance): Promise<void> {
  app.get("/rota", { preHandler: [bearerAuth] }, async (request, reply) => {
    const { teamId } = request.query as { teamId?: string };
    const where: Record<string, unknown> = {};
    if (teamId) where["teamId"] = teamId;
    const rota = await prisma.rota.findMany({ where, include: { engineer: true, team: true }, orderBy: { startTime: "asc" } });
    return reply.send({ items: rota, total: rota.length });
  });

  app.post("/rota/generate", { preHandler: [bearerAuth, requireRole("lead", "manager")] }, async (request, reply) => {
    const b = request.body as { teamId: string; weekStart: string; weekEnd: string };
    const team = await prisma.team.findUnique({ where: { id: b.teamId }, include: { members: { include: { engineer: true } } } });
    if (!team) throw new NotFoundError("Team", b.teamId);
    const active = team.members.map((m) => m.engineer).filter((e) => e.isActive && !e.deletedAt);
    if (active.length === 0) return reply.status(400).send({ error: "No active engineers" });

    const shifts = [];
    let current = new Date(b.weekStart).getTime();
    const end = new Date(b.weekEnd).getTime();
    const shiftMs = 8 * 3600 * 1000;
    let idx = 0;
    while (current < end) {
      const eng = active[idx % active.length]!;
      const shift = await prisma.rota.create({ data: { teamId: team.id, engineerId: eng.id, startTime: new Date(current), endTime: new Date(current + shiftMs), shiftType: "primary", status: "scheduled", generatedBy: "system" } });
      shifts.push(shift);
      current += shiftMs;
      idx++;
    }
    return reply.status(201).send({ message: `Generated ${shifts.length} shifts`, shifts });
  });

  app.post("/rota/swap", { preHandler: [bearerAuth] }, async (request, reply) => {
    const b = request.body as { shiftId: string; targetEngineerId: string; reason?: string };
    const shift = await prisma.rota.findUnique({ where: { id: b.shiftId }, include: { engineer: true } });
    if (!shift) throw new NotFoundError("Shift", b.shiftId);
    const updated = await prisma.rota.update({ where: { id: b.shiftId }, data: { engineerId: b.targetEngineerId, generatedBy: "swap", notes: b.reason || `Swap`, status: "swapped" } });
    return reply.send({ message: "Swap completed", shift: updated });
  });
}
