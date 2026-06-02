// ============================================================
// tRPC Module — Registers tRPC middleware on NestJS Express server
// Provides:
//   - tRPC endpoint at /api/trpc
//   - tRPC playground at /api/trpc-playground (dev only)
// ============================================================
import {
  Module,
  OnModuleInit,
  MiddlewareConsumer,
  NestModule,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { Express } from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { renderTrpcPanel } from "trpc-panel";

import { appRouter } from "./app.router";
import { createTrpcContext } from "./trpc.context";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { AuthService } from "../modules/auth/auth.service";
import { IdempotencyService } from "../common/idempotency/idempotency.service";
import { AppConfigService } from "../config/app-config.service";

@Module({
  providers: [],
})
export class TrpcModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger(TrpcModule.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly auth: AuthService,
    private readonly idempotency: IdempotencyService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * After NestJS initializes, register tRPC middleware on Express.
   */
  onModuleInit() {
    const expressApp =
      this.httpAdapterHost.httpAdapter.getInstance() as Express;

    if (!expressApp) {
      this.logger.error("Express instance not available; tRPC not mounted");
      return;
    }

    // Build context factory with injected services
    const createContext = createTrpcContext({
      prisma: this.prisma,
      redis: this.redis,
      auth: this.auth,
      idempotency: this.idempotency,
    });

    // ---- tRPC endpoint ----
    expressApp.use(
      "/api/trpc",
      trpcExpress.createExpressMiddleware({
        router: appRouter,
        createContext,
        onError({ error, path }) {
          console.error(`tRPC error on ${path}:`, error.message);
        },
      }),
    );

    this.logger.log("tRPC endpoint mounted at /api/trpc");

    // ---- tRPC Playground (dev only) ----
    if (this.config.isDev) {
      expressApp.use("/api/trpc-playground", (_req, res) => {
        res.setHeader("Content-Type", "text/html");
        res.send(
          renderTrpcPanel(appRouter, {
            url: `http://localhost:${this.config.port}/api/trpc`,
            transformer: "superjson",
          }),
        );
      });
      this.logger.log("tRPC Playground mounted at /api/trpc-playground");
    }
  }

  configure(_consumer: MiddlewareConsumer) {
    // No additional middleware needed — tRPC is mounted via onModuleInit
  }
}
