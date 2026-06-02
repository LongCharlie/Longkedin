// ============================================================
// tRPC Job Router
// ============================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc.factory";
import { authMiddleware } from "../trpc.middleware";
import { Prisma } from "@prisma/client";

export const jobRouter = router({
  /**
   * Search jobs with optional filters.
   */
  search: publicProcedure
    .use(authMiddleware)
    .input(
      z.object({
        query: z.string().optional(),
        location: z.string().optional(),
        remote: z.boolean().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.JobWhereInput = {
        isActive: true,
      };

      if (input.query) {
        where.OR = [
          { title: { contains: input.query, mode: "insensitive" } },
          { company: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
        ];
      }
      if (input.location)
        where.location = { contains: input.location, mode: "insensitive" };
      if (input.remote !== undefined) where.remote = input.remote;

      const [jobs, total] = await Promise.all([
        ctx.prisma.job.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.prisma.job.count({ where }),
      ]);

      return {
        jobs,
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  /**
   * Get a single job by ID.
   */
  getById: publicProcedure
    .use(authMiddleware)
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findUnique({ where: { id: input.id } });
      if (!job)
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      return job;
    }),

  /**
   * Create a new job (manual entry or quick-add).
   */
  create: publicProcedure
    .use(authMiddleware)
    .input(
      z.object({
        title: z.string().min(1).max(200),
        company: z.string().min(1).max(200),
        location: z.string().max(200).optional(),
        remote: z.boolean().default(false),
        description: z.string().optional(),
        source: z.string().default("manual"),
        sourceUrl: z.string().url().optional().or(z.literal("")),
        salaryMin: z.number().int().positive().optional(),
        salaryMax: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.create({
        data: {
          title: input.title,
          company: input.company,
          location: input.location,
          remote: input.remote,
          description: input.description,
          source: input.source,
          sourceUrl: input.sourceUrl || null,
          salaryMin: input.salaryMin,
          salaryMax: input.salaryMax,
        },
      });
      return job;
    }),

  /**
   * Save a job to user's list (creates Application with SAVED status).
   */
  save: publicProcedure
    .use(authMiddleware)
    .input(
      z.object({
        jobId: z.string().min(1),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.application.findFirst({
        where: { userId: ctx.user!.id, jobId: input.jobId },
      });
      if (existing) return existing;

      const app = await ctx.prisma.application.create({
        data: {
          userId: ctx.user!.id,
          jobId: input.jobId,
          status: "SAVED",
          notes: input.notes,
        },
      });
      return app;
    }),
});
