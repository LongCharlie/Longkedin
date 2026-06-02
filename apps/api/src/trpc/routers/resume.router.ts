// ============================================================
// tRPC Resume Router
// ============================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc.factory";
import { authMiddleware } from "../trpc.middleware";

export const resumeRouter = router({
  /**
   * List user's resumes.
   */
  list: publicProcedure.use(authMiddleware).query(async ({ ctx }) => {
    return ctx.prisma.resume.findMany({
      where: { userId: ctx.user!.id, deletedAt: null },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        status: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        parsedAt: true,
        createdAt: true,
      },
    });
  }),

  /**
   * Get a single resume with parsed data.
   */
  getById: publicProcedure
    .use(authMiddleware)
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const resume = await ctx.prisma.resume.findFirst({
        where: { id: input.id, userId: ctx.user!.id },
      });
      if (!resume)
        throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });
      return resume;
    }),

  /**
   * Initiate upload — returns presigned S3 URL + creates DB record.
   */
  initiateUpload: publicProcedure
    .use(authMiddleware)
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileType: z.enum(["pdf", "docx"]),
        fileSize: z
          .number()
          .int()
          .max(10 * 1024 * 1024),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingCount = await ctx.prisma.resume.count({
        where: { userId: ctx.user!.id, deletedAt: null },
      });

      const resume = await ctx.prisma.resume.create({
        data: {
          userId: ctx.user!.id,
          version: existingCount + 1,
          status: "UPLOADING",
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
        },
      });

      // TODO: Phase 4 — generate real presigned S3 URL
      // For now, return the record with a placeholder
      const s3Key = `resumes/${ctx.user!.id}/${resume.id}/${input.fileName}`;
      await ctx.prisma.resume.update({
        where: { id: resume.id },
        data: { s3Key },
      });

      return { resumeId: resume.id, s3Key };
    }),

  /**
   * Confirm upload complete — triggers AI parsing.
   */
  confirmUpload: publicProcedure
    .use(authMiddleware)
    .input(z.object({ resumeId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const resume = await ctx.prisma.resume.findFirst({
        where: { id: input.resumeId, userId: ctx.user!.id },
      });
      if (!resume) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.prisma.resume.update({
        where: { id: input.resumeId },
        data: { status: "PENDING" },
      });

      // TODO: Phase 4 — publish to RabbitMQ for Worker A
      // For now, just return the updated record

      return { resumeId: input.resumeId, status: "PENDING" };
    }),

  /**
   * Delete resume (soft delete).
   */
  delete: publicProcedure
    .use(authMiddleware)
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.resume.updateMany({
        where: { id: input.id, userId: ctx.user!.id },
        data: { deletedAt: new Date() },
      });
      return { success: true };
    }),
});
