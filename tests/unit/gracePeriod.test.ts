// ============================================
// Unit Tests — Grace Period Logic
// ============================================
// Verifies that P3/P4 alerts get delayed while P1/P2 are immediate.

import { describe, it, expect } from "vitest";

// Test the grace period delay logic directly (extracted from ingest route)
function computeGraceDelay(severity: string, gracePeriodSeconds: number): number {
  const isLowSeverity = severity === "P3" || severity === "P4";
  return isLowSeverity ? gracePeriodSeconds * 1000 : 0;
}

describe("Grace Period Filter", () => {
  const GRACE_PERIOD = 45; // seconds (default from env)

  it("should return 0 delay for P1 (critical)", () => {
    expect(computeGraceDelay("P1", GRACE_PERIOD)).toBe(0);
  });

  it("should return 0 delay for P2 (high)", () => {
    expect(computeGraceDelay("P2", GRACE_PERIOD)).toBe(0);
  });

  it("should return 45000ms delay for P3 (medium)", () => {
    expect(computeGraceDelay("P3", GRACE_PERIOD)).toBe(45000);
  });

  it("should return 45000ms delay for P4 (low)", () => {
    expect(computeGraceDelay("P4", GRACE_PERIOD)).toBe(45000);
  });

  it("should scale with custom grace periods", () => {
    expect(computeGraceDelay("P3", 60)).toBe(60000);
    expect(computeGraceDelay("P3", 0)).toBe(0);
    expect(computeGraceDelay("P4", 120)).toBe(120000);
  });

  it("should return 0 for unknown severity strings", () => {
    expect(computeGraceDelay("P0", GRACE_PERIOD)).toBe(0);
    expect(computeGraceDelay("CRITICAL", GRACE_PERIOD)).toBe(0);
    expect(computeGraceDelay("", GRACE_PERIOD)).toBe(0);
  });
});
