// V1 Router — registers all route modules
import { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";
import { ingestRoutes } from "./ingest.js";
import { incidentRoutes } from "./incidents.js";
import { engineerRoutes } from "./engineers.js";
import { rotaRoutes } from "./rota.js";
import { handoverRoutes } from "./handovers.js";
import { auditLogRoutes } from "./auditLog.js";

export async function v1Routes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  await app.register(ingestRoutes);
  await app.register(incidentRoutes);
  await app.register(engineerRoutes);
  await app.register(rotaRoutes);
  await app.register(handoverRoutes);
  await app.register(auditLogRoutes);
}
