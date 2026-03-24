// ============================================
// Unit Tests — Whisper TTS & Handover Prompt
// ============================================

import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/config/env.js", () => ({
  env: { OPENAI_API_KEY: "" },
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

import { buildHandoverPrompt, HANDOVER_SYSTEM_PROMPT } from "../../src/integrations/whisper.js";

describe("HANDOVER_SYSTEM_PROMPT", () => {
  it("should mention natural speech", () => {
    expect(HANDOVER_SYSTEM_PROMPT).toContain("natural speech");
  });

  it("should mention target length", () => {
    expect(HANDOVER_SYSTEM_PROMPT).toContain("120-200 words");
  });
});

describe("buildHandoverPrompt", () => {
  const context = {
    outgoingName: "Alice",
    incomingName: "Bob",
    teamName: "Platform",
    shiftStart: "2026-03-23T08:00:00Z",
    shiftEnd: "2026-03-23T16:00:00Z",
    openIncidents: [
      { severity: "P2", title: "High CPU on api-gw", durationMinutes: 45, lastAction: "Acknowledged" },
    ],
    resolvedThisShift: [
      { title: "DNS timeout", resolutionNotes: "Restarted CoreDNS" },
    ],
    watchServices: ["payment-gateway"],
  };

  it("should include outgoing and incoming engineer names", () => {
    const prompt = buildHandoverPrompt(context);
    expect(prompt).toContain("Alice");
    expect(prompt).toContain("Bob");
  });

  it("should include team name", () => {
    const prompt = buildHandoverPrompt(context);
    expect(prompt).toContain("Platform");
  });

  it("should include shift times", () => {
    const prompt = buildHandoverPrompt(context);
    expect(prompt).toContain("2026-03-23T08:00:00Z");
    expect(prompt).toContain("2026-03-23T16:00:00Z");
  });

  it("should list open incidents with severity", () => {
    const prompt = buildHandoverPrompt(context);
    expect(prompt).toContain("[P2]");
    expect(prompt).toContain("High CPU on api-gw");
  });

  it("should list resolved incidents", () => {
    const prompt = buildHandoverPrompt(context);
    expect(prompt).toContain("DNS timeout");
    expect(prompt).toContain("Restarted CoreDNS");
  });

  it("should include watch services", () => {
    const prompt = buildHandoverPrompt(context);
    expect(prompt).toContain("payment-gateway");
  });

  it("should show 'None' when no watch services", () => {
    const noWatch = { ...context, watchServices: [] };
    const prompt = buildHandoverPrompt(noWatch);
    expect(prompt).toContain("None");
  });

  it("should handle empty incidents gracefully", () => {
    const empty = { ...context, openIncidents: [], resolvedThisShift: [] };
    const prompt = buildHandoverPrompt(empty);
    expect(prompt).toContain("OPEN INCIDENTS (0)");
    expect(prompt).toContain("RESOLVED THIS SHIFT (0)");
  });
});
