// ============================================================
// Root Application Module
// Composition root for all feature modules
// ============================================================
import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";

import { AppConfigModule } from "./config/app-config.module";
import { AppConfigService } from "./config/app-config.service";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { TrpcModule } from "./trpc/trpc.module";
import { IdempotencyModule } from "./common/idempotency/idempotency.module";
import { UploadModule } from "./modules/upload/upload.module";

@Module({
  imports: [
    // ---- Observability (first, so all logs are structured) ----
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.logLevel,
          transport: config.isDev
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
          redact: [
            "req.headers.cookie",
            "req.headers.authorization",
            "body.password",
            "body.email",
          ],
          serializers: {
            req: (req) => ({
              method: req.method,
              url: req.url,
              traceId: req.headers["x-trace-id"],
            }),
          },
        },
      }),
    }),

    // ---- Configuration (must be global) ----
    AppConfigModule,

    // ---- Database & Cache ----
    PrismaModule,
    RedisModule,

    // ---- Cross-cutting ----
    IdempotencyModule,

    // ---- Feature modules ----
    AuthModule,
    HealthModule,
    UploadModule,

    // ---- tRPC (registered last to collect all routers) ----
    TrpcModule,
  ],
})
export class AppModule {}
