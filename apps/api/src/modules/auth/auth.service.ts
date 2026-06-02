// ============================================================
// AuthService — Authentication & JWT management
// Phase 1: Dev-mode stubs + JWT sign/verify foundation
// ============================================================
import { Injectable, Logger } from "@nestjs/common";
import * as crypto from "crypto";

import { PrismaService } from "../../prisma/prisma.service";
import { AppConfigService } from "../../config/app-config.service";
import { AuthenticatedUser } from "../../common/guards/auth.guard";

// ---- JWT payload ----
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {
    this.jwtSecret = Buffer.from(this.config.nextauthSecret, "utf-8");
  }

  // ==========================================================
  // JWT Operations
  // ==========================================================

  /**
   * Sign a JWT token (HS256).
   */
  signToken(
    payload: Omit<JwtPayload, "iat" | "exp">,
    expiresInSeconds = 900,
  ): string {
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");

    const now = Math.floor(Date.now() / 1000);
    const body = Buffer.from(
      JSON.stringify({
        ...payload,
        iat: now,
        exp: now + expiresInSeconds,
      }),
    ).toString("base64url");

    const signature = crypto
      .createHmac("sha256", this.jwtSecret)
      .update(`${header}.${body}`)
      .digest("base64url");

    return `${header}.${body}.${signature}`;
  }

  /**
   * Verify and decode a JWT token.
   */
  verifyToken(token: string): JwtPayload | null {
    try {
      const [headerB64, bodyB64, sigB64] = token.split(".");
      if (!headerB64 || !bodyB64 || !sigB64) return null;

      // Verify signature
      const expectedSig = crypto
        .createHmac("sha256", this.jwtSecret)
        .update(`${headerB64}.${bodyB64}`)
        .digest("base64url");

      if (sigB64 !== expectedSig) return null;

      // Decode payload
      const payload = JSON.parse(
        Buffer.from(bodyB64, "base64url").toString("utf-8"),
      ) as JwtPayload;

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Sign a refresh token (longer-lived, 7 days).
   */
  signRefreshToken(userId: string): string {
    return this.signToken(
      { sub: userId, email: "", role: "user" },
      604800, // 7 days
    );
  }

  // ==========================================================
  // User Operations
  // ==========================================================

  /**
   * Find or create a user by OAuth profile.
   * Phase 1 stub: always returns a dev user.
   * Phase 2+ will integrate with real OAuth providers.
   */
  async findOrCreateOAuthUser(profile: {
    email: string;
    name?: string;
    provider: string;
    providerId: string;
  }): Promise<AuthenticatedUser> {
    this.logger.debug("findOrCreateOAuthUser (stub)", profile);

    // Try to find existing user
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name || profile.email.split("@")[0],
        },
      });
      this.logger.log(`Created new user: ${user.id} (${user.email})`);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role:
        user.subscriptionTier === "PREMIUM" || user.subscriptionTier === "PRO"
          ? "premium"
          : "user",
    };
  }

  /**
   * Get user by ID.
   */
  async getUserById(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role:
        user.subscriptionTier === "PREMIUM" || user.subscriptionTier === "PRO"
          ? "premium"
          : "user",
    };
  }

  // ==========================================================
  // Login / Register (Phase 1 stubs)
  // ==========================================================

  /**
   * Dev login — generates a JWT for local development.
   * Real implementation will validate OAuth tokens.
   */
  async devLogin(userId?: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AuthenticatedUser;
  }> {
    const id = userId || "dev-user-001";

    // Ensure dev user exists in DB
    let user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id,
          email: "dev@longkedin.local",
          name: "Developer",
        },
      });
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: "user",
    };

    return {
      accessToken: this.signToken({
        sub: authUser.id,
        email: authUser.email,
        role: authUser.role,
      }),
      refreshToken: this.signRefreshToken(authUser.id),
      user: authUser,
    };
  }

  /**
   * Refresh an access token using a valid refresh token.
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    user: AuthenticatedUser;
  } | null> {
    const payload = this.verifyToken(refreshToken);
    if (!payload) return null;

    const user = await this.getUserById(payload.sub);
    if (!user) return null;

    return {
      accessToken: this.signToken({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
      user,
    };
  }
}
