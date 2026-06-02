// ============================================================
// tRPC Root Router — Aggregates all sub-routers
// ============================================================
import { router } from "./trpc.factory";
import { authRouter } from "./routers/auth.router";
import { healthRouter } from "./routers/health.router";
import { userRouter } from "./routers/user.router";

/**
 * Root tRPC router.
 *
 * Route structure (matches API.md):
 *   auth.devLogin
 *   auth.refreshToken
 *   auth.me
 *   health.ping
 *   health.dbCheck
 *   user.getProfile
 *   user.updateProfile
 *   user.deleteAccount
 */
export const appRouter = router({
  auth: authRouter,
  health: healthRouter,
  user: userRouter,
});

// Export type for frontend consumption via @longkedin/shared-types
export type AppRouter = typeof appRouter;
