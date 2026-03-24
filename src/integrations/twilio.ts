// ============================================
// OnCall Maestro — Twilio Integration (PRD 7.5)
// ============================================
// SMS + Voice call for critical incident notifications.

import { logger } from "../utils/logger.js";

const log = logger.child({ component: "twilio" });

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

function getConfig(): TwilioConfig | null {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  const fromNumber = process.env["TWILIO_FROM_NUMBER"];

  if (!accountSid || !authToken || !fromNumber) {
    return null;
  }

  return { accountSid, authToken, fromNumber };
}

/**
 * Send an SMS notification for an incident.
 */
export async function sendSMS(
  phone: string,
  incident: { id: string; title: string; severity: string; service: string }
): Promise<boolean> {
  const config = getConfig();
  if (!config) {
    log.warn("Twilio not configured — SMS skipped");
    return false;
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(config.accountSid, config.authToken);

    const message = await client.messages.create({
      to: phone,
      from: config.fromNumber,
      body: `🚨 OnCall Maestro [${incident.severity}] ${incident.title} — ${incident.service}. ACK: reply YES or use /ack ${incident.id}`,
    });

    log.info({ sid: message.sid, phone, incidentId: incident.id }, "SMS sent");
    return true;
  } catch (err) {
    log.error({ err, phone }, "SMS send failed");
    return false;
  }
}

/**
 * Place a voice call for P1 incidents.
 * Uses TwiML to deliver a spoken alert with keypress acknowledgment.
 */
export async function placeVoiceCall(
  phone: string,
  incident: { id: string; title: string; severity: string; service: string },
  callbackBaseUrl?: string
): Promise<{ success: boolean; callSid?: string }> {
  const config = getConfig();
  if (!config) {
    log.warn("Twilio not configured — voice call skipped");
    return { success: false };
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(config.accountSid, config.authToken);

    // Build TwiML for the voice call
    const twiml = buildVoiceCallTwiml(incident, callbackBaseUrl);

    const call = await client.calls.create({
      to: phone,
      from: config.fromNumber,
      twiml,
      timeout: 30,
      machineDetection: "Enable", // Skip voicemail
    });

    log.info(
      { callSid: call.sid, phone, incidentId: incident.id },
      "Voice call placed"
    );

    return { success: true, callSid: call.sid };
  } catch (err) {
    log.error({ err, phone }, "Voice call failed");
    return { success: false };
  }
}

/**
 * Build TwiML XML for a critical incident voice call.
 * Reads the alert aloud and asks the engineer to press 1 to acknowledge.
 */
function buildVoiceCallTwiml(
  incident: { id: string; title: string; severity: string; service: string },
  callbackBaseUrl?: string
): string {
  const baseUrl = callbackBaseUrl || process.env["APP_BASE_URL"] || "http://localhost:3000";
  const ackCallbackUrl = `${baseUrl}/api/v1/twilio/voice-ack?incidentId=${incident.id}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">
    Attention! This is an OnCall Maestro critical alert.
    Severity: ${incident.severity}.
    Service: ${incident.service}.
    ${incident.title}.
    Press 1 to acknowledge this incident.
    Press 2 to escalate to the next engineer.
  </Say>
  <Gather numDigits="1" action="${ackCallbackUrl}" method="POST" timeout="15">
    <Say voice="Polly.Joanna">
      Press 1 to acknowledge. Press 2 to escalate.
    </Say>
  </Gather>
  <Say voice="Polly.Joanna">
    No response received. This incident will be escalated automatically.
  </Say>
</Response>`;
}

/**
 * Handle voice call keypress (Gather callback from Twilio).
 * Returns TwiML response.
 */
export function handleVoiceAck(digit: string, incidentId: string): string {
  if (digit === "1") {
    log.info({ incidentId }, "Incident acknowledged via voice call");
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Incident acknowledged. Thank you. You can view details in Discord.
  </Say>
</Response>`;
  }

  if (digit === "2") {
    log.info({ incidentId }, "Incident escalated via voice call");
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Escalating to the next engineer. Thank you.
  </Say>
</Response>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Invalid input. Escalating automatically.
  </Say>
</Response>`;
}
