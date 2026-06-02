// ============================================================
// AllExceptionsFilter — Global exception handler
// Standardizes error response format across the entire API
// ============================================================
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === "object") {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        details = resp.errors ? { errors: resp.errors } : undefined;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log
    const traceId = (request as any).traceId || "unknown";
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status} — ${message}`,
        {
          traceId,
          status,
          error:
            exception instanceof Error ? exception.stack : String(exception),
        },
      );
    }

    // Send standardized response
    response.status(status).json({
      success: false,
      error: {
        code: this._getErrorCode(status),
        message,
        ...(details && { details }),
        traceId,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private _getErrorCode(status: number): string {
    // Match our shared error codes from API.md
    const map: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      429: "TOO_MANY_REQUESTS",
      500: "INTERNAL_SERVER_ERROR",
      503: "SERVICE_UNAVAILABLE",
    };
    return map[status] || "INTERNAL_SERVER_ERROR";
  }
}
