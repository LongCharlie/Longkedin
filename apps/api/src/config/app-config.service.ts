// ============================================================
// App Config — Zod-validated environment variables
// Validates at startup → crashes immediately if misconfigured
// ============================================================
import { Injectable } from "@nestjs/common";
import { z } from "zod";

const envSchema = z.object({
  // --- Server ---
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("debug"),

  // --- CORS ---
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  // --- Database ---
  DATABASE_URL: z.string().url().min(1),

  // --- Redis ---
  REDIS_URL: z.string().url().min(1),

  // --- RabbitMQ ---
  RABBITMQ_URL: z.string().url().min(1),

  // --- S3 / MinIO ---
  S3_ENDPOINT: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET_RESUMES: z.string().default("longkedin-resumes"),
  S3_BUCKET_RECORDINGS: z.string().default("longkedin-recordings"),
  S3_REGION: z.string().default("us-east-1"),

  // --- Auth ---
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),

  // --- OAuth ---
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // --- OpenAI (optional, AI features degrade gracefully) ---
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o"),

  // --- Sentry ---
  SENTRY_DSN: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

@Injectable()
export class AppConfigService {
  public readonly config: EnvConfig;

  constructor() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error("❌ Invalid environment variables:");
      console.error(result.error.flatten().fieldErrors);
      process.exit(1);
    }
    this.config = result.data;
  }

  // ---- Convenience getters ----
  get port(): number {
    return this.config.API_PORT;
  }
  get nodeEnv(): string {
    return this.config.NODE_ENV;
  }
  get isDev(): boolean {
    return this.config.NODE_ENV === "development";
  }
  get isProd(): boolean {
    return this.config.NODE_ENV === "production";
  }
  get logLevel(): string {
    return this.config.LOG_LEVEL;
  }

  get corsOrigins(): string[] {
    return this.config.CORS_ORIGINS.split(",").map((s) => s.trim());
  }

  get databaseUrl(): string {
    return this.config.DATABASE_URL;
  }
  get redisUrl(): string {
    return this.config.REDIS_URL;
  }
  get rabbitmqUrl(): string {
    return this.config.RABBITMQ_URL;
  }

  get s3Endpoint(): string {
    return this.config.S3_ENDPOINT;
  }
  get s3AccessKey(): string {
    return this.config.S3_ACCESS_KEY;
  }
  get s3SecretKey(): string {
    return this.config.S3_SECRET_KEY;
  }
  get s3BucketResumes(): string {
    return this.config.S3_BUCKET_RESUMES;
  }
  get s3BucketRecordings(): string {
    return this.config.S3_BUCKET_RECORDINGS;
  }
  get s3Region(): string {
    return this.config.S3_REGION;
  }

  get nextauthSecret(): string {
    return this.config.NEXTAUTH_SECRET;
  }
  get nextauthUrl(): string {
    return this.config.NEXTAUTH_URL;
  }

  get openaiApiKey(): string | undefined {
    return this.config.OPENAI_API_KEY;
  }
  get openaiModel(): string {
    return this.config.OPENAI_MODEL;
  }
  get sentryDsn(): string | undefined {
    return this.config.SENTRY_DSN;
  }
}
