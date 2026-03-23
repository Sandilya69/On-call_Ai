// ============================================
// OnCall Maestro — Claude AI Routing (PRD 7.3)
// ============================================
// Routes incidents to the best engineer using Claude.
// Falls back to rota order if Claude is unavailable (>2s timeout).

import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const log = logger.child({ component: "claude-router" });

interface EngineerContext {
  id: string;
  name: string;
  skills: string[];
  timezone: string;
  isWorkingHours: boolean;
  recentIncidentsResolved: number;
}

interface IncidentContext {
  title: string;
  severity: string;
  service: string;
  description?: string;
  labels: Record<string, unknown>;
}

export interface RoutingResult {
  assigneeId: string;
  backupChain: string[];
  confidence: number;
  rationale: string;
  routedBy: "ai" | "rota";
}

const ROUTING_SYSTEM_PROMPT = `You are an expert on-call routing system. Your job is to select the best engineer to handle an incident.
Always respond with valid JSON only. No preamble.`;

function buildRoutingUserPrompt(
  incident: IncidentContext,
  engineers: EngineerContext[],
  recentIncidents: string[]
): string {
  return `Route this incident to the best available engineer.

INCIDENT:
Title: ${incident.title}
Severity: ${incident.severity}
Service: ${incident.service}
Description: ${incident.description || "N/A"}
Labels: ${JSON.stringify(incident.labels)}

AVAILABLE ENGINEERS:
${engineers.map((e) => JSON.stringify(e)).join("\n")}

RECENT INCIDENTS ON THIS SERVICE (last 5):
${recentIncidents.length > 0 ? recentIncidents.join("\n") : "None"}

Respond with:
{
  "assignee_id": "<uuid>",
  "backup_chain": ["<uuid>", "<uuid>"],
  "confidence": 0.0-1.0,
  "rationale": "<1-2 sentence explanation>"
}`;
}

/**
 * Route an incident to the best engineer using Claude AI.
 * Falls back to first engineer in the pool if Claude fails or times out.
 */
export async function routeWithClaude(
  incident: IncidentContext,
  engineers: EngineerContext[],
  recentIncidents: string[] = []
): Promise<RoutingResult> {
  if (!env.ANTHROPIC_API_KEY || engineers.length === 0) {
    log.warn("Claude routing unavailable — falling back to rota order");
    return fallbackRouting(engineers);
  }

  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const response = await Promise.race([
      client.messages.create({
        model: env.ANTHROPIC_MODEL,
        max_tokens: 300,
        system: ROUTING_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildRoutingUserPrompt(incident, engineers, recentIncidents),
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Claude API timeout")), 2000)
      ),
    ]);

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);

    // Validate assignee exists in pool
    const validAssignee = engineers.find((e) => e.id === parsed.assignee_id);
    if (!validAssignee) {
      log.warn({ parsed }, "Claude returned unknown assignee — fallback");
      return fallbackRouting(engineers);
    }

    const result: RoutingResult = {
      assigneeId: parsed.assignee_id,
      backupChain: Array.isArray(parsed.backup_chain) ? parsed.backup_chain : [],
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      rationale: parsed.rationale || "AI routing decision",
      routedBy: "ai",
    };

    log.info(
      {
        assigneeId: result.assigneeId,
        confidence: result.confidence,
        incident: incident.title,
      },
      "Claude routing complete"
    );
    return result;
  } catch (err) {
    log.error({ err }, "Claude routing failed — falling back to rota order");
    return fallbackRouting(engineers);
  }
}

function fallbackRouting(engineers: EngineerContext[]): RoutingResult {
  const primary = engineers[0];
  if (!primary) {
    return {
      assigneeId: "",
      backupChain: [],
      confidence: 0,
      rationale: "No engineers available",
      routedBy: "rota",
    };
  }
  return {
    assigneeId: primary.id,
    backupChain: engineers.slice(1, 3).map((e) => e.id),
    confidence: 0.5,
    rationale: "Fallback to rota order — Claude unavailable",
    routedBy: "rota",
  };
}
