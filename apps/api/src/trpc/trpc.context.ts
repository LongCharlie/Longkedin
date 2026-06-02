// ============================================================
// tRPC Context — Injected into every procedure
// Contains: current user, prisma, redis, auth service
// ============================================================
import { inferAsyncReturnType } from "@trpc/server";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";

import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { AuthService, JwtPayload } from "../modules/auth/auth.service";
import { IdempotencyService } from "../common/idempotency/idempotency.service";

/**
 * tRPC context — created on every request.
 * All procedures receive this context automatically.
 */
export interface TrpcContext {
  user: {
    id: string;
    email: string;
    name?: string;
    role: "user" | "premium" | "admin";
  } | null;
  prisma: PrismaService;
  redis: RedisService;
  auth: AuthService;
  idempotency: IdempotencyService;
  traceId: string;
}

/**
 * Factory function: builds context from Express request.
 * Called automatically by @trpc/server/adapters/express.
 */
export const createTrpcContext =
  (services: {
    prisma: PrismaService;
    redis: RedisService;
    auth: AuthService;
    idempotency: IdempotencyService;
  }) =>
  async ({ req }: CreateExpressContextOptions): Promise<TrpcContext> => {
    const traceId = (req.headers["x-trace-id"] as string) || "unknown";

    // Extract user from JWT (or dev-mode fallback)
    let user: TrpcContext["user"] = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);

      // Dev mode: "Bearer dev-user-xxx"
      if (token.startsWith("dev-")) {
        const userId = token.replace("dev-", "");
        user = {
          id: userId,
          email: "dev@longkedin.local",
          name: "Developer",
          role: "user",
        };
      } else {
        // Production: verify JWT
        const payload: JwtPayload | null = services.auth.verifyToken(token);
        if (payload) {
          user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role as "user" | "premium" | "admin",
          };
        }
      }
    }

    // Dev fallback: no auth header → default dev user
    if (!user && process.env.NODE_ENV === "development") {
      user = {
        id: "dev-user-001",
        email: "dev@longkedin.local",
        name: "Developer",
        role: "user",
      };
    }

    return {
      user,
      prisma: services.prisma,
      redis: services.redis,
      auth: services.auth,
      idempotency: services.idempotency,
      traceId,
    };
  };

export type TrpcContextType = inferAsyncReturnType<
  ReturnType<typeof createTrpcContext>
>;
