import { FastifyRequest, FastifyReply } from "fastify";
import { verifyHmacSignature } from "../utils/security.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
const log = logger.child({ component: "hmac" });

export async function hmacValidation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const signature = request.headers["x-maestro-signature"] as string | undefined;
  if (process.env["NODE_ENV"] === "development" && !signature) { return; }
  if (!signature) { reply.status(401).send({ error: "Missing signature" }); return; }
  const rawBody = typeof request.body === "string" ? request.body : JSON.stringify(request.body);
  if (!verifyHmacSignature(rawBody, signature, env.WEBHOOK_HMAC_SECRET)) {
    log.warn("HMAC validation failed");
    reply.status(401).send({ error: "Invalid webhook signature" });
  }
}
