// ============================================================
// AuthGuard — JWT/OAuth session verification
// ============================================================
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * Extracted user info from JWT token/session.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: "user" | "premium" | "admin";
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ---- Public routes skip auth ----
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    try {
      const user = await this._extractUser(request);
      if (!user) {
        throw new UnauthorizedException("Authentication required");
      }
      (request as any).user = user;
      return true;
    } catch (error) {
      this.logger.warn("Auth failed", {
        path: request.path,
        error: (error as Error).message,
      });
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  /**
   * Extract user from:
   * 1. Authorization: Bearer <JWT> header
   * 2. next-auth.session-token cookie (for NextAuth compatibility)
   *
   * TODO Phase 1: stub implementation — always returns a dev user.
   * Real JWT verification will be implemented when Auth module is complete.
   */
  private async _extractUser(
    _request: Request,
  ): Promise<AuthenticatedUser | null> {
    // ---- Stub: In Phase 1, use a dev user for local development ----
    const authHeader = _request.headers.authorization;
    if (authHeader?.startsWith("Bearer dev-")) {
      // Dev token format: "Bearer dev-user-{userId}"
      const userId = authHeader.replace("Bearer dev-", "");
      return {
        id: userId || "dev-user-001",
        email: "dev@longkedin.local",
        name: "Developer",
        role: "user",
      };
    }

    // ---- Production path (to be implemented) ----
    // 1. Try JWT from Authorization header
    // 2. Try NextAuth session cookie → lookup in DB/Redis
    // 3. Return null if neither works

    // For now, in dev mode, always return a dev user
    if (process.env.NODE_ENV === "development") {
      return {
        id: "dev-user-001",
        email: "dev@longkedin.local",
        name: "Developer",
        role: "user",
      };
    }

    return null;
  }
}
