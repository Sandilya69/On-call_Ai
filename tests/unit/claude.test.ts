// ============================================
// Unit Tests — Claude AI Router
// ============================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../../src/config/env.js", () => ({
  env: {
    ANTHROPIC_API_KEY: "",
    ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
  },
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

import { routeWithClaude } from "../../src/integrations/claude.js";
import { env } from "../../src/config/env.js";

const mockEngineers = [
  {
    id: "eng-1",
    name: "Alice",
    skills: ["kubernetes", "networking"],
    timezone: "UTC",
    isWorkingHours: true,
    recentIncidentsResolved: 5,
  },
  {
    id: "eng-2",
    name: "Bob",
    skills: ["database", "postgres"],
    timezone: "UTC",
    isWorkingHours: false,
    recentIncidentsResolved: 2,
  },
  {
    id: "eng-3",
    name: "Charlie",
    skills: ["frontend", "cdn"],
    timezone: "Asia/Kolkata",
    isWorkingHours: true,
    recentIncidentsResolved: 0,
  },
];

const mockIncident = {
  title: "Database connection pool exhausted",
  severity: "P1",
  service: "postgres",
  description: "PostgreSQL connection pool has hit max connections",
  labels: { region: "us-east-1", cluster: "prod-01" },
};

describe("routeWithClaude", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fallback to rota when ANTHROPIC_API_KEY is empty", async () => {
    (env as any).ANTHROPIC_API_KEY = "";

    const result = await routeWithClaude(mockIncident, mockEngineers);

    expect(result.routedBy).toBe("rota");
    expect(result.assigneeId).toBe("eng-1"); // first engineer
    expect(result.confidence).toBe(0.5);
    expect(result.rationale).toContain("Fallback");
  });

  it("should fallback when no engineers are available", async () => {
    const result = await routeWithClaude(mockIncident, []);

    expect(result.routedBy).toBe("rota");
    expect(result.assigneeId).toBe("");
    expect(result.confidence).toBe(0);
    expect(result.rationale).toContain("No engineers available");
  });

  it("should include backup chain from remaining engineers", async () => {
    (env as any).ANTHROPIC_API_KEY = "";

    const result = await routeWithClaude(mockIncident, mockEngineers);

    expect(result.backupChain).toEqual(["eng-2", "eng-3"]);
  });

  it("should fallback when Claude API throws", async () => {
    (env as any).ANTHROPIC_API_KEY = "sk-test-key";

    // The Anthropic constructor is mocked to throw on .create
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    (Anthropic as any).mockImplementation(() => ({
      messages: {
        create: vi.fn().mockRejectedValue(new Error("API Error")),
      },
    }));

    // Re-import to get fresh module with mocked API key
    vi.resetModules();
    vi.doMock("../../src/config/env.js", () => ({
      env: { ANTHROPIC_API_KEY: "sk-test-key", ANTHROPIC_MODEL: "claude-sonnet-4-20250514" },
    }));
    vi.doMock("../../src/utils/logger.js", () => ({
      logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
    }));
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockRejectedValue(new Error("API Error")),
        },
      })),
    }));

    const { routeWithClaude: freshRoute } = await import("../../src/integrations/claude.js");
    const result = await freshRoute(mockIncident, mockEngineers);

    expect(result.routedBy).toBe("rota");
    expect(result.assigneeId).toBe("eng-1");
  });

  it("should produce a valid routing result structure", async () => {
    (env as any).ANTHROPIC_API_KEY = "";

    const result = await routeWithClaude(mockIncident, mockEngineers);

    expect(result).toHaveProperty("assigneeId");
    expect(result).toHaveProperty("backupChain");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("rationale");
    expect(result).toHaveProperty("routedBy");
    expect(typeof result.confidence).toBe("number");
    expect(Array.isArray(result.backupChain)).toBe(true);
  });
});
