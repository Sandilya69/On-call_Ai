// ============================================
// OnCall Maestro — Google Calendar Sync (PRD 5.5)
// ============================================
// Syncs rota shifts to Google Calendar as events.
// Supports OAuth2 flow + event CRUD.

import { google, calendar_v3 } from "googleapis";
import { env } from "../config/env.js";
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

const log = logger.child({ component: "google-calendar" });

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

// ── OAuth2 Client ───────────────────────────────

function createOAuth2Client() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return null;
  }
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.GOOGLE_REDIRECT_URI || `http://localhost:${env.PORT}/api/v1/calendar/callback`}`
  );
}

/**
 * Generate an authorization URL for an engineer to grant calendar access.
 */
export function getAuthUrl(engineerId: string): string | null {
  const client = createOAuth2Client();
  if (!client) {
    log.warn("Google OAuth2 not configured");
    return null;
  }

  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state: engineerId, // pass engineer ID through state
    prompt: "consent",
  });
}

/**
 * Exchange authorization code for tokens and save to engineer record.
 */
export async function handleOAuthCallback(
  code: string,
  engineerId: string
): Promise<boolean> {
  const client = createOAuth2Client();
  if (!client) return false;

  try {
    const { tokens } = await client.getToken(code);
    const tokenData = JSON.stringify(tokens);

    await prisma.engineer.update({
      where: { id: engineerId },
      data: { calendarToken: tokenData },
    });

    log.info({ engineerId }, "Google Calendar tokens saved");
    return true;
  } catch (err) {
    log.error({ err, engineerId }, "Failed to exchange Google OAuth code");
    return false;
  }
}

/**
 * Get an authenticated Calendar API client for an engineer.
 */
function getCalendarClient(tokenJson: string): calendar_v3.Calendar | null {
  const client = createOAuth2Client();
  if (!client) return null;

  try {
    const tokens = JSON.parse(tokenJson);
    client.setCredentials(tokens);
    return google.calendar({ version: "v3", auth: client });
  } catch {
    return null;
  }
}

// ── Calendar Event Operations ───────────────────

/**
 * Create a Calendar event for a rota shift.
 */
export async function createShiftEvent(shiftId: string): Promise<string | null> {
  const shift = await prisma.rota.findUnique({
    where: { id: shiftId },
    include: { engineer: true, team: true },
  });
  if (!shift || !shift.engineer.calendarToken) return null;

  const calendar = getCalendarClient(shift.engineer.calendarToken);
  if (!calendar) return null;

  try {
    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `🟢 On-Call: ${shift.team.name} (${shift.shiftType})`,
        description: [
          `On-call shift for team: ${shift.team.name}`,
          `Shift type: ${shift.shiftType}`,
          `Engineer: ${shift.engineer.name}`,
          ``,
          `Managed by OnCall Maestro`,
        ].join("\n"),
        start: {
          dateTime: shift.startTime.toISOString(),
          timeZone: shift.engineer.timezone || "UTC",
        },
        end: {
          dateTime: shift.endTime.toISOString(),
          timeZone: shift.engineer.timezone || "UTC",
        },
        colorId: shift.shiftType === "primary" ? "11" : "7", // Red for primary, Cyan for backup
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 30 },
            { method: "popup", minutes: 10 },
          ],
        },
      },
    });

    // Save Google event ID on the rota entry
    if (event.data.id) {
      await prisma.rota.update({
        where: { id: shiftId },
        data: { googleEventId: event.data.id },
      });
    }

    log.info({ shiftId, googleEventId: event.data.id }, "Calendar event created");
    return event.data.id || null;
  } catch (err) {
    log.error({ err, shiftId }, "Failed to create calendar event");
    return null;
  }
}

/**
 * Update a Calendar event when shift is modified (e.g., swapped).
 */
export async function updateShiftEvent(shiftId: string): Promise<boolean> {
  const shift = await prisma.rota.findUnique({
    where: { id: shiftId },
    include: { engineer: true, team: true },
  });
  if (!shift?.googleEventId || !shift.engineer.calendarToken) return false;

  const calendar = getCalendarClient(shift.engineer.calendarToken);
  if (!calendar) return false;

  try {
    await calendar.events.update({
      calendarId: "primary",
      eventId: shift.googleEventId,
      requestBody: {
        summary: `🟢 On-Call: ${shift.team.name} (${shift.shiftType})`,
        description: [
          `On-call shift for team: ${shift.team.name}`,
          `Engineer: ${shift.engineer.name}`,
          shift.notes ? `Notes: ${shift.notes}` : "",
          `Status: ${shift.status}`,
        ]
          .filter(Boolean)
          .join("\n"),
        start: {
          dateTime: shift.startTime.toISOString(),
          timeZone: shift.engineer.timezone || "UTC",
        },
        end: {
          dateTime: shift.endTime.toISOString(),
          timeZone: shift.engineer.timezone || "UTC",
        },
      },
    });

    log.info({ shiftId, googleEventId: shift.googleEventId }, "Calendar event updated");
    return true;
  } catch (err) {
    log.error({ err, shiftId }, "Failed to update calendar event");
    return false;
  }
}

/**
 * Delete a Calendar event when shift is cancelled.
 */
export async function deleteShiftEvent(shiftId: string): Promise<boolean> {
  const shift = await prisma.rota.findUnique({
    where: { id: shiftId },
    include: { engineer: true },
  });
  if (!shift?.googleEventId || !shift.engineer.calendarToken) return false;

  const calendar = getCalendarClient(shift.engineer.calendarToken);
  if (!calendar) return false;

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: shift.googleEventId,
    });

    await prisma.rota.update({
      where: { id: shiftId },
      data: { googleEventId: null },
    });

    log.info({ shiftId }, "Calendar event deleted");
    return true;
  } catch (err) {
    log.error({ err, shiftId }, "Failed to delete calendar event");
    return false;
  }
}

/**
 * Bulk sync all upcoming shifts for an engineer to Google Calendar.
 */
export async function syncEngineerShifts(engineerId: string): Promise<number> {
  const engineer = await prisma.engineer.findUnique({ where: { id: engineerId } });
  if (!engineer?.calendarToken) return 0;

  const upcoming = await prisma.rota.findMany({
    where: {
      engineerId,
      startTime: { gte: new Date() },
      status: { in: ["scheduled", "active"] },
      googleEventId: null, // Only sync shifts not yet in Calendar
    },
    orderBy: { startTime: "asc" },
    take: 50,
  });

  let synced = 0;
  for (const shift of upcoming) {
    const eventId = await createShiftEvent(shift.id);
    if (eventId) synced++;
  }

  log.info({ engineerId, synced, total: upcoming.length }, "Bulk calendar sync complete");
  return synced;
}
