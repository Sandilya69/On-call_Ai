import { z } from "zod";
import { createFingerprint } from "../utils/security.js";
import { logger } from "../utils/logger.js";

const log = logger.child({ component: "alert-normalizer" });

const SEVERITY_MAP: Record<string, string> = {
  P1: "P1", P2: "P2", P3: "P3", P4: "P4",
  CRITICAL: "P1", HIGH: "P2", MEDIUM: "P3", LOW: "P4",
  "1": "P1", "2": "P2", "3": "P3", "4": "P4",
  SEV1: "P1", SEV2: "P2", SEV3: "P3", SEV4: "P4",
};

export const AlertIngestSchema = z.object({
  title: z.string().min(1).max(512),
  description: z.string().max(5000).optional(),
  severity: z.string().transform((v) => SEVERITY_MAP[v.toUpperCase().trim()] || "P3"),
  service: z.string().min(1).max(255).transform((v) => v.trim().toLowerCase()),
  source: z.enum(["prometheus", "grafana", "pagerduty", "custom"]).default("custom"),
  labels: z.record(z.unknown()).default({}),
  externalId: z.string().max(255).optional(),
  firedAt: z.string().datetime().optional(),
});

export type AlertIngest = z.infer<typeof AlertIngestSchema>;

export interface NormalizedAlert {
  title: string; description?: string; severity: string; service: string;
  source: string; labels: Record<string, unknown>; externalId?: string;
  firedAt: Date; fingerprint: string; rawPayload: Record<string, unknown>;
}

export function normalizeAlert(rawPayload: Record<string, unknown>): NormalizedAlert {
  const parsed = AlertIngestSchema.parse(rawPayload);
  const fingerprint = createFingerprint(parsed.service, parsed.labels, String(parsed.labels["metric"] || ""));
  log.info({ fingerprint: fingerprint.slice(0, 12), severity: parsed.severity, service: parsed.service }, "Alert normalized");
  return {
    title: parsed.title, description: parsed.description, severity: parsed.severity,
    service: parsed.service, source: parsed.source, labels: parsed.labels,
    externalId: parsed.externalId, firedAt: parsed.firedAt ? new Date(parsed.firedAt) : new Date(),
    fingerprint, rawPayload,
  };
}
