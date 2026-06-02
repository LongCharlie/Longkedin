// ============================================================
// NestJS Application Entry Point
// Registers tsconfig paths for module alias resolution
// ============================================================
import "dotenv/config"; // Load .env before any imports
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { AppModule } from "./app.module";
import { AppConfigService } from "./config/app-config.service";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { TraceInterceptor } from "./common/interceptors/trace.interceptor";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";
import { ZodValidationPipe } from "./common/pipes/zod-validation.pipe";

async function bootstrap() {
  // ---- Create app with buffered logs (logs flush after init) ----
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(AppConfigService);

  // ---- Logger ----
  app.useLogger(app.get(Logger));

  // ---- Security ----
  app.use(helmet()); // CSP, XSS, clickjacking headers
  app.use(cookieParser());
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // ---- Global prefix ----
  app.setGlobalPrefix("api");

  // ---- Global pipes ----
  // Zod validation (tRPC uses its own, this is fallback for REST)
  app.useGlobalPipes(new ZodValidationPipe());

  // ---- Global interceptors ----
  app.useGlobalInterceptors(
    new TraceInterceptor(), // Inject traceId into every request
    new AuditInterceptor(), // Capture changed_by / changed_at patterns
  );

  // ---- Global exception filter ----
  app.useGlobalFilters(new AllExceptionsFilter());

  // ---- Graceful shutdown ----
  app.enableShutdownHooks();

  // ---- Start ----
  const port = config.port;
  await app.listen(port);
  console.log(`🚀 Longkedin API running on http://localhost:${port}`);
  console.log(`📋 Environment: ${config.nodeEnv}`);
  console.log(
    `🔍 tRPC Playground: http://localhost:${port}/api/trpc-playground`,
  );
}

bootstrap();
