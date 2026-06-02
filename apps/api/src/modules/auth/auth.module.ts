// ============================================================
// AuthModule — Authentication & authorization
// ============================================================
import { Module, Global } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "../../common/guards/auth.guard";
import { RoleGuard } from "../../common/guards/role.guard";

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    // ---- Global guards (applied to ALL routes) ----
    {
      provide: APP_GUARD,
      useClass: AuthGuard, // Applied first: checks JWT/session
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard, // Applied second: checks RBAC roles
    },
    // Note: ThrottlerGuard is applied per-module as needed
  ],
  exports: [AuthService],
})
export class AuthModule {}
