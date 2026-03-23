// ============================================
// OnCall Maestro — Prometheus Metrics
// ============================================
// Exposes /api/v1/metrics for Prometheus scraping.

import { FastifyInstance } from "fastify";
import client from "prom-client";
import { getQueueHealth } from "../../workers/queues.js";

// Initialize default metrics (CPU, memory, event loop lag, etc.)
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// ── Custom Metrics ──────────────────────────────

export const httpRequestDuration = new client.Histogram({
  name: "maestro_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const incidentCounter = new client.Counter({
  name: "maestro_incidents_total",
  help: "Total number of incidents created",
  labelNames: ["severity", "source"],
  registers: [register],
});

export const alertDedupCounter = new client.Counter({
  name: "maestro_alerts_deduped_total",
  help: "Total number of alerts suppressed by dedup",
  registers: [register],
});

export const escalationCounter = new client.Counter({
  name: "maestro_escalations_total",
  help: "Total number of escalation events",
  labelNames: ["level", "reason"],
  registers: [register],
});

export const notificationCounter = new client.Counter({
  name: "maestro_notifications_total",
  help: "Total number of notifications sent",
  labelNames: ["channel", "status"],
  registers: [register],
});

export const handoverCounter = new client.Counter({
  name: "maestro_handovers_total",
  help: "Total number of handover briefings generated",
  labelNames: ["status"],
  registers: [register],
});

export const ackLatency = new client.Histogram({
  name: "maestro_ack_latency_seconds",
  help: "Time from incident creation to acknowledgement",
  buckets: [10, 30, 60, 120, 300, 600, 1800, 3600],
  registers: [register],
});

const queueDepthGauge = new client.Gauge({
  name: "maestro_queue_depth",
  help: "Current depth of BullMQ queues",
  labelNames: ["queue", "state"],
  registers: [register],
});

// ── Route Registration ──────────────────────────

export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  // Prometheus metrics endpoint (no auth — standard for internal scraping)
  app.get("/metrics", async (_request, reply) => {
    // Update queue depth gauges
    try {
      const health = await getQueueHealth();
      for (const [name, counts] of Object.entries(health)) {
        queueDepthGauge.set({ queue: name, state: "waiting" }, counts.waiting);
        queueDepthGauge.set({ queue: name, state: "active" }, counts.active);
        queueDepthGauge.set({ queue: name, state: "failed" }, counts.failed);
      }
    } catch {
      // Queue health check failed — metrics will show stale values
    }

    reply.header("Content-Type", register.contentType);
    return reply.send(await register.metrics());
  });
}
