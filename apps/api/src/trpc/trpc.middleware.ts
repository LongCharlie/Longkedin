// ============================================================
// tRPC Middleware — Auth protection for procedures
// Usage: protectedProcedure = publicProcedure.use(authMiddleware)
// ============================================================
import { TRPCError } from "@trpc/server";
import { middleware } from "./trpc.factory";

/**
 * Auth middleware: ensures user is authenticated.
 * Narrows ctx.user to non-nullable.
 */
export const authMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }
  return next({
    ctx: {
      user: ctx.user, // Now narrowed to non-nullable
    },
  });
});

/**
 * Admin middleware: ensures user has admin role.
 * Must be used AFTER authMiddleware.
 */
export const adminMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next();
});

/**
 * Rate limit middleware: checks sliding window rate limit.
 */
export const rateLimitMiddleware = (opts: {
  limit: number;
  windowMs: number;
}) => {
  return middleware(async ({ ctx, path, next }) => {
    const userId = ctx.user?.id || "anonymous";
    const key = `rate:user:${userId}:trpc:${path}`;

    const { allowed } = await ctx.redis.checkRateLimit(
      key,
      opts.limit,
      opts.windowMs,
    );

    if (!allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded: ${opts.limit} requests per ${opts.windowMs / 1000}s`,
      });
    }

    return next();
  });
};
