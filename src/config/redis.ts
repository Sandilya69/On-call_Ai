// ============================================
// OnCall Maestro — Redis Client (Optional)
// ============================================
// Falls back to in-memory Map when Redis is unavailable.

import { logger } from "../utils/logger.js";

const log = logger.child({ component: "redis" });

// In-memory fallback store
const memoryStore = new Map<string, { value: string; expiresAt: number }>();

let redisClient: any = null;
let useMemory = true;

async function initRedis(): Promise<void> {
  const redisUrl = process.env["REDIS_URL"];
  if (!redisUrl) {
    log.info("No REDIS_URL — using in-memory store (dev mode)");
    return;
  }

  try {
    const ioredis = await import("ioredis");
    const Redis = ioredis.default || ioredis;
    redisClient = new (Redis as any)(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      connectTimeout: 3000,
      retryStrategy(times: number) {
        if (times > 3) {
          log.warn("Redis connection failed after 3 attempts — using memory fallback");
          useMemory = true;
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        log.warn("Redis connection timeout — using memory fallback");
        resolve();
      }, 3000);

      redisClient.once("ready", () => {
        clearTimeout(timeout);
        useMemory = false;
        log.info("Redis connected");
        resolve();
      });

      redisClient.once("error", (err: Error) => {
        clearTimeout(timeout);
        log.warn({ err: err.message }, "Redis connection error — using memory fallback");
        resolve();
      });
    });
  } catch {
    log.warn("Redis import/connection failed — using memory fallback");
  }
}

// Initialize on module load
const redisReady = initRedis();

// Clean expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt > 0 && entry.expiresAt < now) {
      memoryStore.delete(key);
    }
  }
}, 10_000);

// ── Redis-compatible API ─────────────────────────
export const redis = {
  async set(
    key: string,
    value: string,
    mode?: string,
    ttl?: number,
    flag?: string
  ): Promise<string | null> {
    await redisReady;

    if (!useMemory && redisClient) {
      if (mode === "EX" && ttl && flag === "NX") {
        return redisClient.set(key, value, "EX", ttl, "NX");
      }
      if (mode === "EX" && ttl) {
        return redisClient.set(key, value, "EX", ttl);
      }
      return redisClient.set(key, value);
    }

    // Memory fallback
    if (flag === "NX" && memoryStore.has(key)) {
      const existing = memoryStore.get(key)!;
      if (existing.expiresAt === 0 || existing.expiresAt > Date.now()) {
        return null; // Key exists — NX fails
      }
    }

    const expiresAt = ttl ? Date.now() + ttl * 1000 : 0;
    memoryStore.set(key, { value, expiresAt });
    return "OK";
  },

  async get(key: string): Promise<string | null> {
    await redisReady;

    if (!useMemory && redisClient) {
      return redisClient.get(key);
    }

    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  },

  async del(key: string): Promise<number> {
    await redisReady;

    if (!useMemory && redisClient) {
      return redisClient.del(key);
    }

    return memoryStore.delete(key) ? 1 : 0;
  },

  async ping(): Promise<string> {
    await redisReady;

    if (!useMemory && redisClient) {
      return redisClient.ping();
    }
    return "PONG";
  },

  async quit(): Promise<void> {
    if (redisClient) {
      await redisClient.quit();
    }
  },
};

export function createRedisConnection(): any {
  if (!useMemory && redisClient) {
    const Redis = require("ioredis");
    return new Redis(process.env["REDIS_URL"], {
      maxRetriesPerRequest: null,
    });
  }
  return null;
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
