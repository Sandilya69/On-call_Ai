// Handover Routes (PRD 6.4)
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database.js";
import { bearerAuth } from "../../middleware/auth.js";
import { NotFoundError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
import fs from "node:fs";

const log = logger.child({ component: "handovers" });

export async function handoverRoutes(app: FastifyInstance): Promise<void> {
  // List handover briefings
  app.get("/handovers", { preHandler: [bearerAuth] }, async (request, reply) => {
    const { teamId, page, perPage } = request.query as Record<string, string | undefined>;
    const pageNum = parseInt(page || "1", 10);
    const limit = Math.min(parseInt(perPage || "25", 10), 100);
    const where: Record<string, unknown> = {};
    if (teamId) where["teamId"] = teamId;

    const [handovers, total] = await Promise.all([
      prisma.handover.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limit,
        take: limit,
        include: {
          outgoingEngineer: { select: { id: true, name: true, email: true } },
          incomingEngineer: { select: { id: true, name: true, email: true } },
          team: { select: { id: true, name: true } },
          shift: { select: { id: true, startTime: true, endTime: true } },
        },
      }),
      prisma.handover.count({ where }),
    ]);

    return reply.send({
      items: handovers,
      total,
      page: pageNum,
      perPage: limit,
      totalPages: Math.ceil(total / limit),
    });
  });

  // Get single handover
  app.get("/handovers/:id", { preHandler: [bearerAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const handover = await prisma.handover.findUnique({
      where: { id },
      include: {
        outgoingEngineer: true,
        incomingEngineer: true,
        team: true,
        shift: true,
      },
    });
    if (!handover) throw new NotFoundError("Handover", id);
    return reply.send(handover);
  });

  // Stream handover audio file
  app.get("/handovers/:id/audio", { preHandler: [bearerAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const handover = await prisma.handover.findUnique({
      where: { id },
      select: { audioUrl: true },
    });
    if (!handover) throw new NotFoundError("Handover", id);
    if (!handover.audioUrl) {
      return reply.status(404).send({ error: "No audio available for this handover" });
    }

    // If it's a local file path, stream it
    if (handover.audioUrl.startsWith("/") || handover.audioUrl.startsWith("C:")) {
      const filePath = handover.audioUrl;
      if (!fs.existsSync(filePath)) {
        return reply.status(404).send({ error: "Audio file not found" });
      }
      const stream = fs.createReadStream(filePath);
      return reply.header("Content-Type", "audio/mpeg").send(stream);
    }

    // If it's an external URL, redirect
    return reply.redirect(handover.audioUrl);
  });
}
