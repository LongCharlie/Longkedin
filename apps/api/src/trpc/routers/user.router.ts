// ============================================================
// tRPC User Router
// Procedures: getProfile, updateProfile, deleteAccount
// ============================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { publicProcedure, router } from "../trpc.factory";
import { authMiddleware } from "../trpc.middleware";

export const userRouter = router({
  /**
   * Get current user's full profile.
   */
  getProfile: publicProcedure.use(authMiddleware).query(async ({ ctx }) => {
    const userId = ctx.user!.id;
    const user = await ctx.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      targetRole: user.targetRole,
      targetLevel: user.targetLevel,
      subscriptionTier: user.subscriptionTier,
      profile: user.profile,
      createdAt: user.createdAt,
    };
  }),

  /**
   * Update user profile (partial update).
   */
  updateProfile: publicProcedure
    .use(authMiddleware)
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        targetRole: z.string().max(100).optional(),
        targetLevel: z.enum(["ENTRY", "MID", "SENIOR"]).optional(),
        targetIndustry: z.string().max(100).optional(),
        bio: z.string().max(2000).optional(),
        linkedinUrl: z.string().url().optional().or(z.literal("")),
        githubUrl: z.string().url().optional().or(z.literal("")),
        portfolioUrl: z.string().url().optional().or(z.literal("")),
        location: z.string().max(200).optional(),
        phone: z.string().max(30).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id;
      const user = await ctx.prisma.user.update({
        where: { id: userId },
        data: {
          name: input.name,
          targetRole: input.targetRole,
          targetLevel: input.targetLevel,
          targetIndustry: input.targetIndustry,
          profile:
            input.bio || input.linkedinUrl || input.githubUrl
              ? {
                  upsert: {
                    create: {
                      bio: input.bio,
                      linkedinUrl: input.linkedinUrl,
                      githubUrl: input.githubUrl,
                      portfolioUrl: input.portfolioUrl,
                      location: input.location,
                      phone: input.phone,
                    },
                    update: {
                      bio: input.bio,
                      linkedinUrl: input.linkedinUrl,
                      githubUrl: input.githubUrl,
                      portfolioUrl: input.portfolioUrl,
                      location: input.location,
                      phone: input.phone,
                    },
                  },
                }
              : undefined,
        },
        include: { profile: true },
      });

      return user;
    }),

  /**
   * Delete account (soft delete).
   */
  deleteAccount: publicProcedure
    .use(authMiddleware)
    .mutation(async ({ ctx }) => {
      const userId = ctx.user!.id;
      await ctx.prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });
      return { success: true };
    }),
});
