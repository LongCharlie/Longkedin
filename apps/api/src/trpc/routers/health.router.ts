// ============================================================
// tRPC Health Router
// Procedures: ping (public), dbCheck (admin)
// ============================================================
import { publicProcedure, router } from "../trpc.factory";
import { adminMiddleware } from "../trpc.middleware";

export const healthRouter = router({
  /**
   * Simple ping — always returns ok.
   */
  ping: publicProcedure.query(() => {
    return { pong: true, timestamp: new Date().toISOString() };
  }),

  /**
   * Database connectivity check (admin only).
   */
  dbCheck: publicProcedure.use(adminMiddleware).query(async ({ ctx }) => {
    try {
      await ctx.prisma.$queryRaw`SELECT 1`;
      return { db: "connected" };
    } catch (error) {
      return {
        db: "disconnected",
        error: (error as Error).message,
      };
    }
  }),
});
