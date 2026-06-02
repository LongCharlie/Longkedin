// ============================================================
// tRPC Application Router — Core state machine
// ============================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc.factory";
import { authMiddleware } from "../trpc.middleware";
import { VALID_STATUS_TRANSITIONS } from "@longkedin/shared-types";

export const applicationRouter = router({
  /**
   * List applications grouped by status (for Kanban).
   */
  list: publicProcedure
    .use(authMiddleware)
    .input(
      z
        .object({
          status: z.string().optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.user!.id };
      if (input?.status) where.status = input.status;

      const apps = await ctx.prisma.application.findMany({
        where,
        include: {
          job: true,
          resume: { select: { id: true, fileName: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      // Group by status for Kanban
      const columns: Record<string, any[]> = {
        SAVED: [],
        APPLIED: [],
        PHONE_SCREEN: [],
        TECHNICAL_INTERVIEW: [],
        ONSITE: [],
        OFFER: [],
        ACCEPTED: [],
        DECLINED: [],
        NEGOTIATING: [],
        REJECTED: [],
        WITHDRAWN: [],
      };

      for (const app of apps) {
        if (columns[app.status]) columns[app.status].push(app);
      }

      return { applications: apps, columns };
    }),

  /**
   * Create an application.
   */
  create: publicProcedure
    .use(authMiddleware)
    .input(
      z.object({
        jobId: z.string().min(1),
        resumeId: z.string().optional(),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.idempotency.guard(
        `${ctx.user!.id}:apply:${input.jobId}`,
        "application.create",
        async () => {
          return ctx.prisma.application.create({
            data: {
              userId: ctx.user!.id,
              jobId: input.jobId,
              resumeId: input.resumeId,
              status: "APPLIED",
              appliedAt: new Date(),
              notes: input.notes,
            },
            include: { job: true },
          });
        },
      );
    }),

  /**
   * Update application status (state machine transition).
   */
  updateStatus: publicProcedure
    .use(authMiddleware)
    .input(
      z.object({
        id: z.string().min(1),
        targetStatus: z.string().min(1),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.prisma.application.findFirst({
        where: { id: input.id, userId: ctx.user!.id },
      });
      if (!app)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });

      // Validate transition
      const valid = VALID_STATUS_TRANSITIONS[app.status];
      if (!valid?.includes(input.targetStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from ${app.status} to ${input.targetStatus}`,
        });
      }

      return ctx.redis.withLock(`app:${input.id}:status`, 5000, async () => {
        const updated = await ctx.prisma.application.update({
          where: { id: input.id },
          data: {
            status: input.targetStatus as any,
            notes: input.notes ?? app.notes,
            statusChangedAt: new Date(),
            statusChangedBy: ctx.user!.id,
          },
          include: { job: true },
        });

        // Log status history
        await ctx.prisma.statusHistory.create({
          data: {
            applicationId: input.id,
            fromStatus: app.status as any,
            toStatus: input.targetStatus as any,
            changedBy: ctx.user!.id,
          },
        });

        return updated;
      });
    }),

  /**
   * Delete an application.
   */
  delete: publicProcedure
    .use(authMiddleware)
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.application.deleteMany({
        where: { id: input.id, userId: ctx.user!.id },
      });
      return { success: true };
    }),
});
