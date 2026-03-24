// ============================================
// OnCall Maestro — Twilio Webhook Routes
// ============================================
// Handles voice call acknowledgment callbacks from Twilio.

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../config/database.js";
import { setAckState } from "../../services/dedup.js";
import { handleVoiceAck } from "../../integrations/twilio.js";
import { logger } from "../../utils/logger.js";

const log = logger.child({ component: "twilio-routes" });

export async function twilioRoutes(app: FastifyInstance): Promise<void> {
  // Twilio voice Gather callback — handles keypress during voice call
  app.post("/twilio/voice-ack", async (request, reply) => {
    const { incidentId } = request.query as { incidentId?: string };
    const body = request.body as { Digits?: string; CallSid?: string; From?: string };
    const digit = body.Digits || "";

    log.info({ incidentId, digit, callSid: body.CallSid }, "Voice ACK callback received");

    if (incidentId && digit === "1") {
      // Acknowledge the incident
      const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
      if (incident && incident.status === "open") {
        await prisma.incident.update({
          where: { id: incidentId },
          data: { status: "acknowledged", acknowledgedAt: new Date() },
        });
        await setAckState(incidentId, "voice-call");

        await prisma.auditLog.create({
          data: {
            orgId: incident.orgId,
            actorType: "system",
            action: "incident.acknowledged_via_voice",
            entityType: "incident",
            entityId: incidentId,
            metadata: JSON.stringify({
              callSid: body.CallSid,
              from: body.From,
              timeToAckMs: Date.now() - incident.createdAt.getTime(),
            }),
          },
        });
      }
    } else if (incidentId && digit === "2") {
      // Log escalation request — the escalation worker will handle it
      await prisma.auditLog.create({
        data: {
          orgId: (await prisma.incident.findUnique({ where: { id: incidentId } }))?.orgId || "",
          actorType: "system",
          action: "incident.escalated_via_voice",
          entityType: "incident",
          entityId: incidentId,
          metadata: JSON.stringify({ callSid: body.CallSid }),
        },
      });
    }

    // Return TwiML response
    const twiml = handleVoiceAck(digit, incidentId || "unknown");
    reply.header("Content-Type", "text/xml");
    return reply.send(twiml);
  });
}
