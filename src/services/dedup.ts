import { redis } from "../config/redis.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
const log = logger.child({ component: "dedup" });

export async function checkDedup(fingerprint: string): Promise<boolean> {
  const key = `dedup:${fingerprint}`;
  const result = await redis.set(key, Date.now().toString(), "EX", env.DEDUP_TTL_SECONDS, "NX");
  if (result === "OK") { log.debug({ fp: fingerprint.slice(0, 12) }, "New alert"); return true; }
  log.info({ fp: fingerprint.slice(0, 12) }, "Duplicate suppressed");
  return false;
}

export async function setAckState(incidentId: string, engineerId: string): Promise<void> {
  await redis.set(`ack:${incidentId}`, engineerId, "EX", 86400);
}

export async function getAckState(incidentId: string): Promise<string | null> {
  return redis.get(`ack:${incidentId}`);
}
