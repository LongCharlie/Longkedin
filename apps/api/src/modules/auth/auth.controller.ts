// ============================================================
// AuthController — REST endpoints for auth
// tRPC routes are defined separately
// ============================================================
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";

import { AuthService } from "./auth.service";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AuthGuard, AuthenticatedUser } from "../../common/guards/auth.guard";

// ---- DTOs ----
class DevLoginDto {
  userId?: string;
}

class RefreshTokenDto {
  refreshToken!: string;
}

@Controller("rest/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/rest/auth/dev-login
   * Dev-only: generates a JWT for local development.
   */
  @Public()
  @Post("dev-login")
  @HttpCode(HttpStatus.OK)
  async devLogin(@Body() body: DevLoginDto) {
    return this.authService.devLogin(body.userId);
  }

  /**
   * POST /api/rest/auth/refresh
   * Refresh an access token.
   */
  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenDto) {
    const result = await this.authService.refreshAccessToken(body.refreshToken);
    if (!result) {
      return {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid refresh token" },
      };
    }
    return { success: true, data: result };
  }

  /**
   * GET /api/rest/auth/me
   * Get current user profile.
   */
  @UseGuards(AuthGuard)
  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    const fullUser = await this.authService.getUserById(user.id);
    return { success: true, data: fullUser || user };
  }
}
