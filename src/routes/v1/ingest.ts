// Alert Ingest Route — POST /api/v1/ingest/:orgSlug
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database.js";
import { normalizeAlert } from "../../services/alertNormalizer.js";
import { checkDedup } from "../../services/dedup.js";
import { hmacValidation } from "../../middleware/hmac.js";
import { alertQueue } from "../../workers/queues.js";
import { NotFoundError } from "../../utils/errors.js";
import { logger } from "../../utils/logger.js";
const log = logger.child({ component: "ingest" });

export async function ingestRoutes(app: FastifyInstance): Promise<void> {
  app.post("/ingest/:orgSlug", { preHandler: [hmacValidation] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { orgSlug } = request.params as { orgSlug: string };
      const payload = request.body as Record<string, unknown>;
      log.info({ orgSlug }, "Alert received");

      const org = await prisma.organisation.findUnique({ where: { slug: orgSlug } });
      if (!org) throw new NotFoundError("Organisation", orgSlug);

      const alert = normalizeAlert(payload);

      // Dedup check
      const isNew = await checkDedup(alert.fingerprint);
      if (!isNew) {
        return reply.status(200).send({ status: "duplicate", message: "Alert deduplicated — no action taken" });
      }

      // Persist incident
      const incident = await prisma.incident.create({
        data: {
          orgId: org.id, fingerprint: alert.fingerprint,
          title: alert.title, description: alert.description,
          severity: alert.severity, service: alert.service, source: alert.source,
          status: "open", externalId: alert.externalId,
          labels: JSON.stringify(alert.labels),
          rawPayload: JSON.stringify(alert.rawPayload),
          firedAt: alert.firedAt,
        },
      });

      // Queue async processing (AI routing → notify → escalation) if BullMQ is available
      if (alertQueue) {
        await alertQueue.add(`alert:${incident.id}`, {
          incidentId: incident.id,
          orgId: org.id,
          severity: alert.severity,
          service: alert.service,
        });
        log.info({ incidentId: incident.id }, "Alert queued for async processing");
      }

      log.info({ incidentId: incident.id, severity: alert.severity, service: alert.service }, "Incident created");

      // Return 202 Accepted (per PRD — never block the sender)
      return reply.status(202).send({
        status: "accepted",
        incident: { id: incident.id, title: incident.title, severity: incident.severity, service: incident.service, status: incident.status },
      });
    }
  );
}
