// ============================================
// Unit Tests — Security Utilities
// ============================================

import { describe, it, expect } from "vitest";
import { createFingerprint, verifyHmacSignature } from "../../src/utils/security.js";

describe("createFingerprint", () => {
  it("should return a 64-character hex string (SHA-256)", () => {
    const fp = createFingerprint("api-gateway", {}, "");
    expect(fp).toHaveLength(64);
    expect(fp).toMatch(/^[a-f0-9]{64}$/);
  });

  it("should produce deterministic output for same input", () => {
    const fp1 = createFingerprint("svc", { region: "us" }, "cpu");
    const fp2 = createFingerprint("svc", { region: "us" }, "cpu");
    expect(fp1).toBe(fp2);
  });

  it("should change with different service names", () => {
    const fp1 = createFingerprint("service-a", {}, "");
    const fp2 = createFingerprint("service-b", {}, "");
    expect(fp1).not.toBe(fp2);
  });

  it("should change with different labels", () => {
    const fp1 = createFingerprint("svc", { env: "prod" }, "");
    const fp2 = createFingerprint("svc", { env: "staging" }, "");
    expect(fp1).not.toBe(fp2);
  });

  it("should change with different metric names", () => {
    const fp1 = createFingerprint("svc", {}, "cpu_usage");
    const fp2 = createFingerprint("svc", {}, "memory_usage");
    expect(fp1).not.toBe(fp2);
  });

  it("should sort labels for consistent fingerprinting", () => {
    const fp1 = createFingerprint("svc", { a: "1", b: "2" }, "");
    const fp2 = createFingerprint("svc", { b: "2", a: "1" }, "");
    expect(fp1).toBe(fp2);
  });

  it("should handle empty labels", () => {
    const fp = createFingerprint("svc", {}, "metric");
    expect(fp).toHaveLength(64);
  });

  it("should handle labels with various value types", () => {
    const fp = createFingerprint("svc", { num: 42, bool: true, str: "hello" }, "");
    expect(fp).toHaveLength(64);
  });
});

describe("verifyHmacSignature", () => {
  const secret = "test-webhook-secret-key";

  function computeSignature(payload: string, key: string): string {
    const crypto = require("node:crypto");
    return "sha256=" + crypto.createHmac("sha256", key).update(payload).digest("hex");
  }

  it("should return true for a valid signature", () => {
    const payload = JSON.stringify({ event: "alert.fired" });
    const signature = computeSignature(payload, secret);
    expect(verifyHmacSignature(payload, signature, secret)).toBe(true);
  });

  it("should return false for an invalid signature", () => {
    const payload = JSON.stringify({ event: "alert.fired" });
    expect(verifyHmacSignature(payload, "sha256=invalid", secret)).toBe(false);
  });

  it("should return false when payload is tampered", () => {
    const original = JSON.stringify({ event: "alert.fired" });
    const tampered = JSON.stringify({ event: "alert.resolved" });
    const signature = computeSignature(original, secret);
    expect(verifyHmacSignature(tampered, signature, secret)).toBe(false);
  });

  it("should return false with wrong secret", () => {
    const payload = "hello";
    const signature = computeSignature(payload, secret);
    expect(verifyHmacSignature(payload, signature, "wrong-secret")).toBe(false);
  });

  it("should work with Buffer payload", () => {
    const payload = Buffer.from(JSON.stringify({ event: "test" }));
    const signature = computeSignature(payload.toString(), secret);
    expect(verifyHmacSignature(payload, signature, secret)).toBe(true);
  });

  it("should return false for mismatched length signatures", () => {
    expect(verifyHmacSignature("data", "sha256=abc", secret)).toBe(false);
  });
});
