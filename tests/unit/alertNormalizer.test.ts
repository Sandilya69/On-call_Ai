// ============================================
// Unit Tests — Alert Normalizer
// ============================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module
vi.mock("../../src/config/env.js", () => ({
  env: { DEDUP_TTL_SECONDS: 30, GRACE_PERIOD_SECONDS: 45 },
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

import { normalizeAlert, AlertIngestSchema } from "../../src/services/alertNormalizer.js";

describe("AlertIngestSchema", () => {
  it("should parse a valid alert payload", () => {
    const payload = {
      title: "CPU usage critical",
      severity: "P1",
      service: "api-gateway",
      source: "prometheus",
      labels: { region: "us-east-1" },
    };
    const result = AlertIngestSchema.parse(payload);
    expect(result.title).toBe("CPU usage critical");
    expect(result.severity).toBe("P1");
    expect(result.service).toBe("api-gateway");
    expect(result.source).toBe("prometheus");
  });

  it("should normalize severity strings (CRITICAL → P1, HIGH → P2, etc.)", () => {
    expect(AlertIngestSchema.parse({ title: "x", severity: "CRITICAL", service: "s" }).severity).toBe("P1");
    expect(AlertIngestSchema.parse({ title: "x", severity: "HIGH", service: "s" }).severity).toBe("P2");
    expect(AlertIngestSchema.parse({ title: "x", severity: "MEDIUM", service: "s" }).severity).toBe("P3");
    expect(AlertIngestSchema.parse({ title: "x", severity: "LOW", service: "s" }).severity).toBe("P4");
  });

  it("should normalize SEV1-SEV4 severity format", () => {
    expect(AlertIngestSchema.parse({ title: "x", severity: "SEV1", service: "s" }).severity).toBe("P1");
    expect(AlertIngestSchema.parse({ title: "x", severity: "SEV2", service: "s" }).severity).toBe("P2");
    expect(AlertIngestSchema.parse({ title: "x", severity: "SEV3", service: "s" }).severity).toBe("P3");
    expect(AlertIngestSchema.parse({ title: "x", severity: "SEV4", service: "s" }).severity).toBe("P4");
  });

  it("should default unknown severity to P3", () => {
    const result = AlertIngestSchema.parse({ title: "x", severity: "UNKNOWN", service: "s" });
    expect(result.severity).toBe("P3");
  });

  it("should lowercase and trim service names", () => {
    const result = AlertIngestSchema.parse({ title: "x", severity: "P1", service: "  MyService  " });
    expect(result.service).toBe("myservice");
  });

  it("should default source to 'custom'", () => {
    const result = AlertIngestSchema.parse({ title: "x", severity: "P1", service: "s" });
    expect(result.source).toBe("custom");
  });

  it("should default labels to empty object", () => {
    const result = AlertIngestSchema.parse({ title: "x", severity: "P1", service: "s" });
    expect(result.labels).toEqual({});
  });

  it("should reject empty title", () => {
    expect(() => AlertIngestSchema.parse({ title: "", severity: "P1", service: "s" })).toThrow();
  });

  it("should reject missing service", () => {
    expect(() => AlertIngestSchema.parse({ title: "alert", severity: "P1" })).toThrow();
  });

  it("should reject invalid source values", () => {
    expect(() => AlertIngestSchema.parse({ title: "alert", severity: "P1", service: "s", source: "invalid" })).toThrow();
  });
});

describe("normalizeAlert", () => {
  it("should produce a normalized alert with fingerprint", () => {
    const raw = { title: "DB Down", severity: "P1", service: "postgres", source: "prometheus", labels: {} };
    const result = normalizeAlert(raw);

    expect(result.title).toBe("DB Down");
    expect(result.severity).toBe("P1");
    expect(result.service).toBe("postgres");
    expect(result.fingerprint).toBeDefined();
    expect(typeof result.fingerprint).toBe("string");
    expect(result.fingerprint.length).toBe(64); // SHA-256 hex
    expect(result.rawPayload).toEqual(raw);
  });

  it("should produce consistent fingerprints for same input", () => {
    const raw1 = { title: "A", severity: "P1", service: "s", labels: { x: 1 } };
    const raw2 = { title: "B", severity: "P2", service: "s", labels: { x: 1 } };
    const fp1 = normalizeAlert(raw1).fingerprint;
    const fp2 = normalizeAlert(raw2).fingerprint;

    // Same service + labels → same fingerprint (title doesn't affect fingerprint)
    expect(fp1).toBe(fp2);
  });

  it("should produce different fingerprints for different services", () => {
    const raw1 = { title: "A", severity: "P1", service: "api", labels: {} };
    const raw2 = { title: "A", severity: "P1", service: "db", labels: {} };
    const fp1 = normalizeAlert(raw1).fingerprint;
    const fp2 = normalizeAlert(raw2).fingerprint;

    expect(fp1).not.toBe(fp2);
  });

  it("should set firedAt to now when not provided", () => {
    const before = new Date();
    const result = normalizeAlert({ title: "x", severity: "P1", service: "s" });
    const after = new Date();

    expect(result.firedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.firedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("should use provided firedAt date", () => {
    const firedAt = "2026-01-15T10:30:00.000Z";
    const result = normalizeAlert({ title: "x", severity: "P1", service: "s", firedAt });
    expect(result.firedAt.toISOString()).toBe(firedAt);
  });
});
