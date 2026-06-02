// ============================================================
// AuditInterceptor — Captures audit metadata for state changes
// Hooks into the response to detect "update" patterns
// ============================================================
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { Request } from "express";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // Inject audit metadata into request body for mutations
    if (user && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      if (request.body && typeof request.body === "object") {
        // Don't override if explicitly set
        if (!request.body._audit) {
          request.body._audit = {
            changedBy: user.id,
            changedAt: new Date().toISOString(),
          };
        }
      }
    }

    return next.handle();
  }
}
