// Health Check Routes
import { FastifyInstance } from "fastify";
import { prisma } from "../../config/database.js";
import { redis } from "../../config/redis.js";
import { env } from "../../config/env.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    const checks: Record<string, string> = {};
    let isHealthy = true;

    try { await prisma.$queryRawUnsafe("SELECT 1"); checks["database"] = "connected"; }
    catch { checks["database"] = "disconnected"; isHealthy = false; }

    try { await redis.ping(); checks["redis"] = "connected"; }
    catch { checks["redis"] = "disconnected"; isHealthy = false; }

    return reply.status(isHealthy ? 200 : 503).send({
      status: isHealthy ? "healthy" : "degraded",
      version: "1.0.0",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  app.get("/health/live", async (_req, reply) => reply.send({ status: "alive" }));
  app.get("/health/ready", async (_req, reply) => {
    try { await prisma.$queryRawUnsafe("SELECT 1"); return reply.send({ status: "ready" }); }
    catch { return reply.status(503).send({ status: "not ready" }); }
  });
}
