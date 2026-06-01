// ============================================================
// Shared Zod Schemas — Single Source of Truth
// Used by: apps/web, apps/api
// ============================================================
import { z } from "zod";

// ── Enums ────────────────────────────────────
export const ApplicationStatusEnum = z.enum([
  "SAVED",
  "APPLIED",
  "PHONE_SCREEN",
  "TECHNICAL_INTERVIEW",
  "ONSITE",
  "OFFER",
  "ACCEPTED",
  "DECLINED",
  "NEGOTIATING",
  "REJECTED",
  "WITHDRAWN",
]);

export const InterviewTypeEnum = z.enum([
  "BEHAVIORAL",
  "TECHNICAL",
  "SYSTEM_DESIGN",
  "CASE_STUDY",
  "MIXED",
]);

export const InterviewDifficultyEnum = z.enum(["ENTRY", "MID", "SENIOR", "STAFF"]);

export const ResumeStatusEnum = z.enum([
  "UPLOADING",
  "PENDING",
  "PARSING",
  "PARSED",
  "PARSE_FAILED",
]);

export const NotificationChannelEnum = z.enum(["EMAIL", "IN_APP", "PUSH"]);

// ── Valid Status Transitions ─────────────────
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  SAVED: ["APPLIED"],
  APPLIED: ["PHONE_SCREEN", "REJECTED", "WITHDRAWN"],
  PHONE_SCREEN: ["TECHNICAL_INTERVIEW", "REJECTED"],
  TECHNICAL_INTERVIEW: ["ONSITE", "REJECTED"],
  ONSITE: ["OFFER", "REJECTED"],
  OFFER: ["ACCEPTED", "DECLINED", "NEGOTIATING"],
  NEGOTIATING: ["ACCEPTED", "DECLINED"],
};

// ── Job Schemas ───────────────────────────────
export const JobSearchInput = z.object({
  query: z.string().optional(),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  source: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

// ── Application Schemas ───────────────────────
export const CreateApplicationInput = z.object({
  idempotencyKey: z.string().uuid(),
  jobId: z.string().min(1),
  resumeId: z.string().min(1),
  notes: z.string().max(1000).optional(),
});

export const UpdateApplicationStatusInput = z.object({
  applicationId: z.string().min(1),
  targetStatus: ApplicationStatusEnum,
  idempotencyKey: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── Resume Schemas ────────────────────────────
export const UploadResumeInput = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.enum(["pdf", "docx"]),
  fileSize: z.number().int().max(10 * 1024 * 1024), // 10MB
});

export const ConfirmResumeUploadInput = z.object({
  resumeId: z.string().min(1),
  s3Key: z.string().min(1),
});

// ── Interview Schemas ─────────────────────────
export const CreateInterviewInput = z.object({
  applicationId: z.string().optional(),
  type: InterviewTypeEnum,
  difficulty: InterviewDifficultyEnum,
  focusAreas: z.array(z.string()).min(1).max(10),
  maxQuestions: z.number().int().min(1).max(20).default(5),
});

// ── API Response Wrapper ──────────────────────
export const ApiResponse = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.boolean(),
    data: data.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.string(), z.unknown()).optional(),
        traceId: z.string().optional(),
      })
      .optional(),
    meta: z
      .object({
        page: z.number().optional(),
        pageSize: z.number().optional(),
        total: z.number().optional(),
      })
      .optional(),
  });

// ── Export Types ──────────────────────────────
export type ApplicationStatus = z.infer<typeof ApplicationStatusEnum>;
export type InterviewType = z.infer<typeof InterviewTypeEnum>;
export type InterviewDifficulty = z.infer<typeof InterviewDifficultyEnum>;
export type ResumeStatus = z.infer<typeof ResumeStatusEnum>;
export type JobSearchParams = z.infer<typeof JobSearchInput>;
export type CreateApplicationParams = z.infer<typeof CreateApplicationInput>;
export type UpdateApplicationStatusParams = z.infer<typeof UpdateApplicationStatusInput>;
