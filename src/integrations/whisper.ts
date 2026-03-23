// ============================================
// OnCall Maestro — Whisper TTS (PRD 7.6)
// ============================================
// Converts briefing scripts to natural-sounding audio via OpenAI TTS.

import OpenAI from "openai";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const log = logger.child({ component: "whisper-tts" });

export interface TTSResult {
  audioBuffer: Buffer;
  durationEstimate: number; // seconds
  filePath?: string;
}

/**
 * Generate speech audio from briefing text using OpenAI TTS.
 * Returns the audio buffer and an estimated duration.
 */
export async function generateSpeech(
  text: string,
  outputDir?: string
): Promise<TTSResult> {
  if (!env.OPENAI_API_KEY) {
    log.warn("OpenAI API key not configured — returning empty audio");
    return { audioBuffer: Buffer.alloc(0), durationEstimate: 0 };
  }

  try {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    // Estimate ~150 words per minute for spoken audio
    const wordCount = text.split(/\s+/).length;
    const durationEstimate = Math.ceil((wordCount / 150) * 60);

    log.info({ wordCount, estimatedDuration: durationEstimate }, "Generating TTS audio");

    const response = await client.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
      response_format: "mp3",
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    let filePath: string | undefined;
    if (outputDir) {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const fileId = crypto.randomUUID();
      filePath = path.join(outputDir, `handover-${fileId}.mp3`);
      fs.writeFileSync(filePath, audioBuffer);
      log.info({ filePath, size: audioBuffer.length }, "Audio file saved");
    }

    return { audioBuffer, durationEstimate, filePath };
  } catch (err) {
    log.error({ err }, "TTS generation failed");
    throw err;
  }
}

/**
 * Build handover briefing prompt for Claude.
 * The output should be natural speech (~120-200 words).
 */
export const HANDOVER_SYSTEM_PROMPT = `You are generating a spoken handover briefing for an on-call engineer.
Write it as natural speech — clear, concise, and actionable. No bullet points.
Target length: 45-75 seconds when read aloud (approximately 120-200 words).`;

export function buildHandoverPrompt(context: {
  outgoingName: string;
  incomingName: string;
  teamName: string;
  shiftStart: string;
  shiftEnd: string;
  openIncidents: { severity: string; title: string; durationMinutes: number; lastAction: string }[];
  resolvedThisShift: { title: string; resolutionNotes: string }[];
  watchServices: string[];
}): string {
  return `Generate a shift handover briefing.

OUTGOING: ${context.outgoingName} (shift: ${context.shiftStart} to ${context.shiftEnd})
INCOMING: ${context.incomingName}
TEAM: ${context.teamName}

OPEN INCIDENTS (${context.openIncidents.length}):
${context.openIncidents.map((i) => `[${i.severity}] ${i.title} - open for ${i.durationMinutes}min, last action: ${i.lastAction}`).join("\n")}

RESOLVED THIS SHIFT (${context.resolvedThisShift.length}):
${context.resolvedThisShift.map((i) => `${i.title} - fixed by ${i.resolutionNotes}`).join("\n")}

WATCH LIST (services with elevated errors):
${context.watchServices.length > 0 ? context.watchServices.join(", ") : "None"}

Write the briefing as if you are ${context.outgoingName} speaking directly to ${context.incomingName}.`;
}
