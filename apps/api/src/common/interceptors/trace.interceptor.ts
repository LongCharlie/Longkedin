// ============================================================
// TraceInterceptor — Injects traceId + requestId into every request
// Also adds user context to logs
// ============================================================
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const traceId = (request.headers["x-trace-id"] as string) || uuidv4();
    const requestId = (request.headers["x-request-id"] as string) || uuidv4();

    // Attach to request for downstream
    (request as any).traceId = traceId;
    (request as any).requestId = requestId;

    // Set response headers
    response.setHeader("X-Trace-Id", traceId);
    response.setHeader("X-Request-Id", requestId);

    const start = Date.now();
    const { method, path: url } = request;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${response.statusCode} ${duration}ms`,
            {
              traceId,
              requestId,
              method,
              url,
              statusCode: response.statusCode,
              duration,
            },
          );
        },
        error: (error) => {
          const duration = Date.now() - start;
          this.logger.error(
            `${method} ${url} ${error.status || 500} ${duration}ms`,
            {
              traceId,
              requestId,
              method,
              url,
              statusCode: error.status || 500,
              duration,
              error: error.message,
            },
          );
        },
      }),
    );
  }
}
