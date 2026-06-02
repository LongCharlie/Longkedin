// ============================================================
// tRPC Auth Router
// Procedures: register, login, refreshToken, me
// ============================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { publicProcedure, router } from "../trpc.factory";
import { authMiddleware } from "../trpc.middleware";
import { rateLimitMiddleware } from "../trpc.middleware";

export const authRouter = router({
  /**
   * Dev login — generates JWT for local development.
   * Protected by rate limit: 10 requests per minute.
   */
  devLogin: publicProcedure
    .use(rateLimitMiddleware({ limit: 10, windowMs: 60_000 }))
    .input(
      z.object({
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.auth.devLogin(input.userId);
      return result;
    }),

  /**
   * Refresh access token.
   */
  refreshToken: publicProcedure
    .use(rateLimitMiddleware({ limit: 30, windowMs: 60_000 }))
    .input(
      z.object({
        refreshToken: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.auth.refreshAccessToken(input.refreshToken);
      if (!result) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired refresh token",
        });
      }
      return result;
    }),

  /**
   * Get current user profile (requires auth).
   */
  me: publicProcedure.use(authMiddleware).query(async ({ ctx }) => {
    // authMiddleware ensures ctx.user is non-null
    const userId = ctx.user!.id;
    const user = await ctx.auth.getUserById(userId);
    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }
    return user;
  }),
});
