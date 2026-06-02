// ============================================================
// HealthService — Probe all dependencies
// ============================================================
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Full health check with dependency probing.
   */
  async check(): Promise<{
    status: "ok" | "degraded" | "down";
    uptime: number;
    timestamp: string;
    dependencies: Record<
      string,
      { status: string; latencyMs?: number; error?: string }
    >;
  }> {
    const deps: Record<
      string,
      { status: string; latencyMs?: number; error?: string }
    > = {};
    let overall: "ok" | "degraded" | "down" = "ok";

    // ---- PostgreSQL ----
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      deps["postgresql"] = { status: "ok", latencyMs: Date.now() - start };
    } catch (error) {
      deps["postgresql"] = { status: "down", error: (error as Error).message };
      overall = "down";
    }

    // ---- Redis ----
    try {
      const start = Date.now();
      await this.redis.client.ping();
      deps["redis"] = { status: "ok", latencyMs: Date.now() - start };
    } catch (error) {
      deps["redis"] = { status: "down", error: (error as Error).message };
      overall = "down";
    }

    return {
      status: overall,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      dependencies: deps,
    };
  }

  /**
   * Liveness probe — minimal check (is the process alive?).
   */
  liveness(): { status: "ok" } {
    return { status: "ok" };
  }

  /**
   * Readiness probe — can the app serve traffic?.
   */
  async readiness(): Promise<{ status: "ok" | "not_ready" }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.redis.client.ping();
      return { status: "ok" };
    } catch {
      return { status: "not_ready" };
    }
  }
}
