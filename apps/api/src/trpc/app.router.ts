// ============================================================
// tRPC Root Router — Aggregates all sub-routers
// ============================================================
import { router } from "./trpc.factory";
import { authRouter } from "./routers/auth.router";
import { healthRouter } from "./routers/health.router";
import { userRouter } from "./routers/user.router";
import { jobRouter } from "./routers/job.router";
import { applicationRouter } from "./routers/application.router";
import { resumeRouter } from "./routers/resume.router";

export const appRouter = router({
  auth: authRouter,
  health: healthRouter,
  user: userRouter,
  job: jobRouter,
  application: applicationRouter,
  resume: resumeRouter,
});

// Export type for frontend consumption via @longkedin/shared-types
export type AppRouter = typeof appRouter;
