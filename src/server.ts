// ============================================
// OnCall Maestro — Fastify Server
// ============================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { env, isDev } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { disconnectRedis } from "./config/redis.js";
import { v1Routes } from "./routes/v1/index.js";
import { initDiscord, disconnectDiscord } from "./integrations/discord.js";
import { startCronJobs, stopCronJobs } from "./jobs/cron.js";
import { logger } from "./utils/logger.js";
import { MaestroError } from "./utils/errors.js";

const log = logger.child({ component: "server" });

async function buildApp() {
  const app = Fastify({ logger: false, trustProxy: true });

  await app.register(cors, { origin: isDev ? true : ["https://maestro.yourdomain.com"], credentials: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: env.JWT_EXPIRY } });
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

  // Global error handler
  app.setErrorHandler((err, request, reply) => {
    const error = err as any;
    if (error instanceof MaestroError) {
      log.warn({ err: error, path: request.url }, error.message);
      return reply.status(error.statusCode).send({ error: error.message, detail: error.detail });
    }
    if (error.validation) return reply.status(422).send({ error: "Validation Error", detail: error.message });
    if (error.statusCode === 429) return reply.status(429).send({ error: "Too Many Requests" });
    log.error({ err: error, path: request.url }, "Unhandled error");
    return reply.status(500).send({ error: "Internal Server Error", ...(isDev && { detail: error.message }) });
  });

  app.setNotFoundHandler((_req, reply) => reply.status(404).send({ error: "Not Found" }));

  // Request logging
  app.addHook("onResponse", async (request, reply) => {
    log.info({ method: request.method, url: request.url, status: reply.statusCode, ms: reply.elapsedTime?.toFixed(1) }, "request");
  });

  // Routes
  await app.register(v1Routes, { prefix: "/api/v1" });

  // Root
  app.get("/", async () => ({
    name: "OnCall Maestro API", version: "1.0.0",
    endpoints: {
      health: "GET /api/v1/health",
      metrics: "GET /api/v1/metrics",
      ingest: "POST /api/v1/ingest/:orgSlug",
      incidents: "GET /api/v1/incidents",
      engineers: "GET /api/v1/engineers",
      rota: "GET /api/v1/rota",
      rotaGenerate: "POST /api/v1/rota/generate",
      rotaSwap: "POST /api/v1/rota/swap",
      availability: "GET /api/v1/availability",
      handovers: "GET /api/v1/handovers",
      auditLog: "GET /api/v1/audit-log",
      calendarAuth: "GET /api/v1/calendar/auth",
      calendarSync: "POST /api/v1/calendar/sync",
      billingPlans: "GET /api/v1/billing/plans",
      billingCheckout: "POST /api/v1/billing/checkout",
      billingPortal: "POST /api/v1/billing/portal",
      twilioVoiceAck: "POST /api/v1/twilio/voice-ack",
    },
  }));

  return app;
}

async function start() {
  try {
    await connectDatabase();
    log.info("✅ Database connected");

    // Start Discord bot (non-blocking — runs in background)
    const discordClient = await initDiscord();
    if (discordClient) {
      log.info("✅ Discord bot connected");
    } else {
      log.warn("⚠️  Discord bot not started (no DISCORD_BOT_TOKEN)");
    }

    // Start cron jobs
    startCronJobs();
    log.info("✅ Cron jobs started");

    const app = await buildApp();
    await app.listen({ port: env.PORT, host: env.HOST });

    log.info(`🚀 OnCall Maestro API running on http://localhost:${env.PORT}`);
    log.info(`   Environment: ${env.NODE_ENV}`);
    log.info(`   Health:      http://localhost:${env.PORT}/api/v1/health`);
  } catch (err) {
    log.fatal({ err }, "Server startup failed");
    process.exit(1);
  }
}

const shutdown = async (signal: string) => {
  log.info({ signal }, "Shutting down...");
  stopCronJobs();
  await disconnectDiscord();
  await disconnectDatabase();
  await disconnectRedis();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
