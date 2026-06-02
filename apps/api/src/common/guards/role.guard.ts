// ============================================================
// RoleGuard — RBAC authorization check
// Usage: @Roles('admin') or @Roles('premium', 'admin')
// ============================================================
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthenticatedUser } from "./auth.guard";

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles required → allow
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = (request as any).user;

    if (!user) {
      throw new ForbiddenException("No authenticated user");
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Requires one of roles: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
