// ============================================================
// Smoke Test — Pure unit tests, no NestJS DI, no Docker
// Run: pnpm vitest run
// ============================================================
import { describe, it, expect, vi } from "vitest";

// Set env BEFORE importing any module that reads process.env
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL = "redis://localhost:6379/0";
process.env.RABBITMQ_URL = "amqp://guest:guest@localhost:5672";
process.env.S3_ENDPOINT = "http://localhost:9000";
process.env.S3_ACCESS_KEY = "minioadmin";
process.env.S3_SECRET_KEY = "minioadmin";
process.env.NEXTAUTH_SECRET = "this-is-a-test-secret-that-is-long-enough!!";
process.env.NEXTAUTH_URL = "http://localhost:3000";

import { AppConfigService } from "../src/config/app-config.service";
import { AuthService } from "../src/modules/auth/auth.service";
import { IdempotencyService } from "../src/common/idempotency/idempotency.service";
import { HealthService } from "../src/modules/health/health.service";

// ---- Mocks ----
function mockPrisma() {
  return {
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    $use: vi.fn(),
    $on: vi.fn(),
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi
        .fn()
        .mockResolvedValue({
          id: "u1",
          email: "t@t.com",
          name: "Test",
          subscriptionTier: "FREE",
          deletedAt: null,
        }),
      update: vi.fn().mockResolvedValue({ id: "u1" }),
    },
  } as any;
}

function mockRedis() {
  return {
    client: { ping: vi.fn().mockResolvedValue("PONG") },
    checkIdempotencyKey: vi.fn().mockResolvedValue(null),
    setIdempotencyKey: vi.fn().mockResolvedValue(undefined),
    checkRateLimit: vi
      .fn()
      .mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: Date.now() + 60000,
      }),
  } as any;
}

// ============================================================
describe("Phase 1 Smoke Tests (no Docker, no DI)", () => {
  // 1. Config
  // ============================================================
  describe("AppConfigService", () => {
    const config = new AppConfigService();

    it("parses NODE_ENV", () => expect(config.nodeEnv).toBe("test"));
    it("parses PORT", () => expect(config.port).toBe(4000));
    it("parses DATABASE_URL", () =>
      expect(config.databaseUrl).toContain("postgresql"));
    it("parses REDIS_URL", () => expect(config.redisUrl).toContain("redis"));
    it("parses NEXTAUTH_SECRET", () =>
      expect(config.nextauthSecret.length).toBeGreaterThanOrEqual(32));
    it("parses CORS origins", () =>
      expect(config.corsOrigins).toContain("http://localhost:3000"));
    it("dev mode off in test", () => expect(config.isDev).toBe(false));
    it("S3 config", () => {
      expect(config.s3Endpoint).toBe("http://localhost:9000");
      expect(config.s3BucketResumes).toBe("longkedin-resumes");
      expect(config.s3BucketRecordings).toBe("longkedin-recordings");
    });
  });

  // 2. Auth — JWT
  // ============================================================
  describe("AuthService", () => {
    const config = new AppConfigService();
    const prisma = mockPrisma();
    const auth = new AuthService(prisma, config);

    it("signs a valid JWT (3-part format)", () => {
      const token = auth.signToken({
        sub: "u1",
        email: "a@b.com",
        role: "user",
      });
      const parts = token.split(".");
      expect(parts).toHaveLength(3);
      // Each part is base64url
      parts.forEach((p) =>
        expect(() => Buffer.from(p, "base64url")).not.toThrow(),
      );
    });

    it("verify returns correct payload", () => {
      const token = auth.signToken({
        sub: "user-1",
        email: "u@b.com",
        role: "premium",
      });
      const payload = auth.verifyToken(token);
      expect(payload).not.toBeNull();
      expect(payload!.sub).toBe("user-1");
      expect(payload!.email).toBe("u@b.com");
      expect(payload!.role).toBe("premium");
      expect(payload!.iat).toBeDefined();
      expect(payload!.exp).toBeDefined();
    });

    it("rejects tampered token (signature mismatch)", () => {
      const token = auth.signToken({
        sub: "u1",
        email: "a@b.com",
        role: "user",
      });
      const parts = token.split(".");
      // Tamper with payload: change sub to "hacker"
      parts[1] = Buffer.from(
        JSON.stringify({ sub: "hacker", role: "admin" }),
      ).toString("base64url");
      expect(auth.verifyToken(parts.join("."))).toBeNull();
    });

    it("rejects token with wrong secret", () => {
      const token = auth.signToken({
        sub: "u1",
        email: "a@b.com",
        role: "user",
      });
      // Create another AuthService with different secret
      process.env.NEXTAUTH_SECRET = "a-different-secret-that-is-long-enough!!";
      const otherConfig = new AppConfigService();
      const otherAuth = new AuthService(prisma, otherConfig);
      process.env.NEXTAUTH_SECRET =
        "this-is-a-test-secret-that-is-long-enough!!"; // restore
      expect(otherAuth.verifyToken(token)).toBeNull();
    });

    it("rejects expired token", () => {
      const token = auth.signToken(
        { sub: "u1", email: "a@b.com", role: "user" },
        -1, // expired 1 second ago
      );
      expect(auth.verifyToken(token)).toBeNull();
    });

    it("refresh token has 7-day expiry", () => {
      const token = auth.signRefreshToken("u1");
      const payload = auth.verifyToken(token);
      expect(payload).not.toBeNull();
      expect(payload!.exp! - payload!.iat!).toBe(604800); // 7 days in seconds
    });

    it("devLogin creates tokens + user", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: "dev-user-001",
        email: "dev@longkedin.local",
        name: "Developer",
        subscriptionTier: "FREE",
        deletedAt: null,
      });
      const result = await auth.devLogin();
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.id).toBe("dev-user-001");
      expect(result.user.role).toBe("user");
    });

    it("getUserById returns null for deleted user", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "x",
        email: "x@x.com",
        subscriptionTier: "FREE",
        deletedAt: new Date(),
      });
      expect(await auth.getUserById("x")).toBeNull();
    });

    it("refreshAccessToken with valid token returns new access token", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@b.com",
        subscriptionTier: "PREMIUM",
        name: "Test",
        deletedAt: null,
      });
      const refreshToken = auth.signRefreshToken("u1");
      const result = await auth.refreshAccessToken(refreshToken);
      expect(result).not.toBeNull();
      expect(result!.accessToken).toBeTruthy();
      expect(result!.user.role).toBe("premium");
    });

    it("refreshAccessToken with expired token returns null", async () => {
      const expiredToken = auth.signToken(
        { sub: "u1", email: "a@b.com", role: "user" },
        -1,
      );
      expect(await auth.refreshAccessToken(expiredToken)).toBeNull();
    });
  });

  // 3. Idempotency
  // ============================================================
  describe("IdempotencyService", () => {
    const redis = mockRedis();
    const idem = new IdempotencyService(redis);

    it("check returns null for new key", async () => {
      redis.checkIdempotencyKey.mockResolvedValue(null);
      expect(await idem.check("key-1", "test")).toBeNull();
    });

    it("check returns cached result for duplicate key", async () => {
      redis.checkIdempotencyKey.mockResolvedValue(JSON.stringify({ ok: true }));
      expect(await idem.check("key-2", "test")).toEqual({ ok: true });
    });

    it("store writes to Redis", async () => {
      redis.setIdempotencyKey.mockResolvedValue(undefined);
      await idem.store("key-3", { result: 42 });
      expect(redis.setIdempotencyKey).toHaveBeenCalledWith(
        "key-3",
        JSON.stringify({ result: 42 }),
        86400,
      );
    });

    it("guard executes fn on first call", async () => {
      redis.checkIdempotencyKey.mockResolvedValue(null);
      const fn = vi.fn().mockResolvedValue({ data: "ok" });
      const result = await idem.guard("key-4", "res", fn);
      expect(result).toEqual({ data: "ok" });
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  // 4. Health
  // ============================================================
  describe("HealthService", () => {
    const prisma = mockPrisma();
    const redis = mockRedis();
    const health = new HealthService(prisma, redis);

    it("reports all healthy when DB+Redis respond", async () => {
      prisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      redis.client.ping.mockResolvedValue("PONG");
      const result = await health.check();
      expect(result.status).toBe("ok");
      expect(result.dependencies["postgresql"].status).toBe("ok");
      expect(result.dependencies["redis"].status).toBe("ok");
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.timestamp).toBeTruthy();
    });

    it("reports down when DB fails", async () => {
      prisma.$queryRaw.mockRejectedValue(new Error("connection refused"));
      redis.client.ping.mockResolvedValue("PONG");
      const result = await health.check();
      expect(result.status).toBe("down");
      expect(result.dependencies["postgresql"].status).toBe("down");
      expect(result.dependencies["postgresql"].error).toContain(
        "connection refused",
      );
    });

    it("reports down when Redis fails", async () => {
      prisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      redis.client.ping.mockRejectedValue(new Error("NOAUTH"));
      const result = await health.check();
      expect(result.status).toBe("down");
      expect(result.dependencies["redis"].status).toBe("down");
    });

    it("liveness always returns ok", () => {
      expect(health.liveness().status).toBe("ok");
    });

    it("readiness ok when both up", async () => {
      prisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      redis.client.ping.mockResolvedValue("PONG");
      expect((await health.readiness()).status).toBe("ok");
    });

    it("readiness not_ready when DB down", async () => {
      prisma.$queryRaw.mockRejectedValue(new Error("down"));
      redis.client.ping.mockResolvedValue("PONG");
      expect((await health.readiness()).status).toBe("not_ready");
    });
  });
});
