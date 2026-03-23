import { FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../utils/logger.js";
import { AuthenticationError } from "../utils/errors.js";

export interface AuthUser { engineerId: string; orgId: string; role: string; }

export async function bearerAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) throw new AuthenticationError();
    const decoded = await request.jwtVerify<{ sub: string; orgId: string; role: string }>();
    (request as any).user = { engineerId: decoded.sub, orgId: decoded.orgId, role: decoded.role } as AuthUser;
  } catch (error) {
    reply.status(401).send({ error: "Unauthorized", message: error instanceof AuthenticationError ? error.message : "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = (request as any).user as AuthUser | undefined;
    if (!user || !roles.includes(user.role)) {
      reply.status(403).send({ error: "Forbidden", message: `Required role: ${roles.join(" or ")}` });
    }
  };
}
