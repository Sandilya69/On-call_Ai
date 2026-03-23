// ============================================
// OnCall Maestro — Worker Entry Point
// ============================================
// Start all BullMQ workers. Run with: npm run worker

import dotenv from "dotenv";
dotenv.config();

import { logger } from "../utils/logger.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { disconnectRedis } from "../config/redis.js";
import { startAlertWorker } from "./alertWorker.js";
import { startEscalationWorker } from "./escalationWorker.js";
import { startNotificationWorker } from "./notificationWorker.js";
import { closeQueues } from "./queues.js";

const log = logger.child({ component: "worker-main" });

async function startWorkers(): Promise<void> {
  try {
    await connectDatabase();
    log.info("✅ Database connected (workers)");

    const alertWorker = startAlertWorker();
    const escalationWorker = startEscalationWorker();
    const notificationWorker = startNotificationWorker();

    const started = [
      alertWorker && "alert",
      escalationWorker && "escalation",
      notificationWorker && "notification",
    ].filter(Boolean);

    if (started.length === 0) {
      log.warn("No workers started — REDIS_URL may not be configured");
    } else {
      log.info({ workers: started }, `🚀 ${started.length} worker(s) running`);
    }

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      log.info({ signal }, "Shutting down workers...");
      if (alertWorker) await alertWorker.close();
      if (escalationWorker) await escalationWorker.close();
      if (notificationWorker) await notificationWorker.close();
      await closeQueues();
      await disconnectDatabase();
      await disconnectRedis();
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    log.fatal({ err }, "Worker startup failed");
    process.exit(1);
  }
}

startWorkers();
