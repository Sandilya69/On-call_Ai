// ============================================
// OnCall Maestro — Calendar Routes
// ============================================
// Google Calendar OAuth flow + sync endpoints.

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { bearerAuth } from "../../middleware/auth.js";
import type { AuthUser } from "../../middleware/auth.js";
import {
  getAuthUrl,
  handleOAuthCallback,
  syncEngineerShifts,
  createShiftEvent,
} from "../../integrations/googleCalendar.js";
import { logger } from "../../utils/logger.js";

const log = logger.child({ component: "calendar-routes" });

function getUser(request: FastifyRequest): AuthUser {
  return (request as any).user as AuthUser;
}

export async function calendarRoutes(app: FastifyInstance): Promise<void> {
  // Step 1: Redirect engineer to Google OAuth consent screen
  app.get("/calendar/auth", { preHandler: [bearerAuth] }, async (request, reply) => {
    const user = getUser(request);
    const url = getAuthUrl(user.engineerId);

    if (!url) {
      return reply.status(503).send({
        error: "Google Calendar not configured",
        message: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment",
      });
    }

    return reply.send({ authUrl: url });
  });

  // Step 2: Google OAuth callback (exchanges code for tokens)
  app.get("/calendar/callback", async (request, reply) => {
    const { code, state } = request.query as { code?: string; state?: string };

    if (!code || !state) {
      return reply.status(400).send({ error: "Missing code or state parameter" });
    }

    const success = await handleOAuthCallback(code, state);

    if (success) {
      // In production: redirect to dashboard with success message
      return reply.send({
        message: "✅ Google Calendar connected successfully!",
        engineerId: state,
      });
    }

    return reply.status(500).send({ error: "Failed to connect Google Calendar" });
  });

  // Sync all upcoming shifts to Google Calendar
  app.post("/calendar/sync", { preHandler: [bearerAuth] }, async (request, reply) => {
    const user = getUser(request);
    const body = request.body as { engineerId?: string } | undefined;
    const targetId = body?.engineerId || user.engineerId;

    const synced = await syncEngineerShifts(targetId);

    log.info({ engineerId: targetId, synced }, "Calendar sync triggered");

    return reply.send({
      message: `Synced ${synced} shifts to Google Calendar`,
      synced,
    });
  });

  // Sync a single shift to Calendar
  app.post("/calendar/sync/:shiftId", { preHandler: [bearerAuth] }, async (request, reply) => {
    const { shiftId } = request.params as { shiftId: string };

    const eventId = await createShiftEvent(shiftId);

    if (eventId) {
      return reply.send({ message: "Shift synced to Calendar", googleEventId: eventId });
    }

    return reply.status(400).send({
      error: "Failed to sync shift",
      message: "Ensure the engineer has connected their Google Calendar",
    });
  });
}
