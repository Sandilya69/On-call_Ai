// ============================================
// Integration Tests — API Endpoints with Real SQLite
// ============================================
// Tests the actual Fastify server against the real database.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import { v1Routes } from "../../src/routes/v1/index.js";

let app: FastifyInstance;
let prisma: PrismaClient;
let orgId: string;
let engineerId: string;
let teamId: string;
let authToken: string;

// Use a separate test database
const TEST_DB_URL = "file:./test.db";

beforeAll(async () => {
  // Set env vars for test
  process.env["DATABASE_URL"] = TEST_DB_URL;
  process.env["JWT_SECRET"] = "test-jwt-secret-at-least-16-chars";
  process.env["WEBHOOK_HMAC_SECRET"] = "test-hmac-secret";
  process.env["NODE_ENV"] = "development";

  // Initialize Prisma with test DB
  prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });

  // Push schema (creates tables)
  const { execSync } = await import("child_process");
  execSync("npx prisma db push --force-reset --accept-data-loss 2>&1", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    cwd: process.cwd(),
    stdio: "pipe",
  });

  await prisma.$connect();

  // Build Fastify app
  app = Fastify({ logger: false });
  await app.register(cors);
  await app.register(jwt, { secret: "test-jwt-secret-at-least-16-chars" });
  await app.register(v1Routes, { prefix: "/api/v1" });
  await app.ready();

  // Seed test data
  const org = await prisma.organisation.create({
    data: { name: "Test Org", slug: "test-org", plan: "pro" },
  });
  orgId = org.id;

  const engineer = await prisma.engineer.create({
    data: {
      orgId,
      name: "Test Engineer",
      email: "test@maestro.dev",
      phone: "+1234567890",
      isActive: true,
    },
  });
  engineerId = engineer.id;

  const team = await prisma.team.create({
    data: { orgId, name: "Platform Team" },
  });
  teamId = team.id;

  await prisma.teamMember.create({
    data: { teamId, engineerId, role: "member" },
  });

  // Generate auth token
  authToken = app.jwt.sign({
    sub: engineerId,
    orgId,
    role: "manager",
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();

  // Clean up test DB
  const fs = await import("node:fs");
  const path = await import("node:path");
  const dbPath = path.resolve("prisma/test.db");
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const journalPath = dbPath + "-journal";
  if (fs.existsSync(journalPath)) fs.unlinkSync(journalPath);
});

// ── Health ───────────────────────────────────────

describe("GET /api/v1/health", () => {
  it("should return healthy status", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("healthy");
  });
});

// ── Engineers ────────────────────────────────────

describe("Engineers API", () => {
  it("GET /api/v1/engineers should return list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/engineers",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items).toBeDefined();
    expect(body.items.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/v1/engineers should create engineer", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/engineers",
      headers: {
        authorization: `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      payload: {
        name: "New Engineer",
        email: `new-${Date.now()}@maestro.dev`,
        orgId,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("New Engineer");
  });
});

// ── Incidents ────────────────────────────────────

describe("Incidents API", () => {
  let incidentId: string;

  beforeEach(async () => {
    const incident = await prisma.incident.create({
      data: {
        orgId,
        teamId,
        fingerprint: `fp-${Date.now()}`,
        title: "Test Incident",
        severity: "P2",
        service: "api-gateway",
        source: "prometheus",
        status: "open",
        rawPayload: "{}",
        firedAt: new Date(),
      },
    });
    incidentId = incident.id;
  });

  it("GET /api/v1/incidents should return incidents", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/incidents",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items).toBeDefined();
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("GET /api/v1/incidents/:id should return single incident", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/incidents/${incidentId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(incidentId);
    expect(body.title).toBe("Test Incident");
  });

  it("PATCH /api/v1/incidents/:id/ack should acknowledge", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/incidents/${incidentId}/ack`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("acknowledged");
  });

  it("PATCH /api/v1/incidents/:id/resolve should resolve", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/incidents/${incidentId}/resolve`,
      headers: {
        authorization: `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      payload: { notes: "Fixed by restarting the service" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe("resolved");
  });

  it("GET /api/v1/incidents/:id should 404 for unknown ID", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/incidents/non-existent-id",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

// ── Rota ─────────────────────────────────────────

describe("Rota API", () => {
  it("GET /api/v1/rota should return rota list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/rota",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items).toBeDefined();
  });

  it("POST /api/v1/rota/generate should create shifts", async () => {
    const weekStart = new Date();
    weekStart.setUTCDate(weekStart.getUTCDate() + 7);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days for speed

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/rota/generate",
      headers: {
        authorization: `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      payload: {
        teamId,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.shifts).toBeDefined();
    expect(body.shifts.length).toBeGreaterThan(0);
  });
});

// ── Availability ─────────────────────────────────

describe("Availability API", () => {
  it("POST /api/v1/availability should create block", async () => {
    const from = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const to = new Date(from.getTime() + 2 * 24 * 60 * 60 * 1000);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/availability",
      headers: {
        authorization: `Bearer ${authToken}`,
        "content-type": "application/json",
      },
      payload: {
        unavailableFrom: from.toISOString(),
        unavailableTo: to.toISOString(),
        reason: "Holiday",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.reason).toBe("Holiday");
  });

  it("GET /api/v1/availability should return blocks", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/availability",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items).toBeDefined();
  });
});

// ── Audit Log ────────────────────────────────────

describe("Audit Log API", () => {
  it("GET /api/v1/audit-log should return logs", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/audit-log",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items).toBeDefined();
  });
});

// ── Billing ──────────────────────────────────────

describe("Billing API", () => {
  it("GET /api/v1/billing/plans should return plan list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/billing/plans",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.plans).toBeDefined();
    expect(body.plans.length).toBe(3); // free, pro, enterprise
  });

  it("GET /api/v1/billing/status should return current plan", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/billing/status",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.plan).toBeDefined();
  });
});

// ── Handovers ────────────────────────────────────

describe("Handovers API", () => {
  it("GET /api/v1/handovers should return empty list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/handovers",
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items).toBeDefined();
  });
});

// ── Metrics ──────────────────────────────────────

describe("Metrics API", () => {
  it("GET /api/v1/metrics should return Prometheus metrics", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/metrics",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("maestro_");
  });
});

// ── Auth ─────────────────────────────────────────

describe("Authentication", () => {
  it("should reject requests without auth token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/incidents",
    });
    expect(res.statusCode).toBe(401);
  });

  it("should reject requests with invalid token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/incidents",
      headers: { authorization: "Bearer invalid-token" },
    });
    expect(res.statusCode).toBe(401);
  });
});
