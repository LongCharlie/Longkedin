// ============================================================
// RedisService — Redis connection + utilities
// Wraps ioredis with:
//   - Redlock (distributed lock)
//   - Sliding window rate limiting
//   - Session caching helpers
// ============================================================
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import Redis from "ioredis";
import Redlock from "redlock";

import { AppConfigService } from "../config/app-config.service";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  public readonly client: Redis;
  public readonly redlock: Redlock;

  constructor(private readonly config: AppConfigService) {
    this.client = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null; // stop retrying
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    this.redlock = new Redlock([this.client], {
      driftFactor: 0.01,
      retryCount: 3,
      retryDelay: 200,
      retryJitter: 100,
    });

    // ---- Error handling ----
    this.client.on("error", (err) => {
      this.logger.error("Redis error", err);
    });
  }

  async onModuleInit() {
    this.logger.log("Connecting to Redis...");
    await this.client.connect();
    this.logger.log("Redis connected");
  }

  async onModuleDestroy() {
    this.logger.log("Disconnecting from Redis...");
    await this.client.quit();
    this.logger.log("Redis disconnected");
  }

  // ---- Sliding Window Rate Limiter ----
  /**
   * Check if a key has exceeded the rate limit.
   * @param key      Unique key (e.g., `rate:user:{userId}:endpoint`)
   * @param limit    Max requests
   * @param windowMs Window in milliseconds
   * @returns `true` if allowed, `false` if rate limited
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;

    const lua = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local windowMs = tonumber(ARGV[4])

      -- Remove expired entries
      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

      -- Count current window
      local current = redis.call('ZCARD', key)

      if current < limit then
        redis.call('ZADD', key, now, now .. '-' .. math.random())
        redis.call('PEXPIRE', key, windowMs)
        return {1, limit - current - 1, now + windowMs}
      else
        return {0, 0, now + windowMs}
      end
    `;

    const result = (await this.client.eval(
      lua,
      1,
      key,
      now.toString(),
      windowStart.toString(),
      limit.toString(),
      windowMs.toString(),
    )) as [number, number, number];

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      resetAt: result[2],
    };
  }

  // ---- Idempotency Key ----
  /**
   * Check and set an idempotency key atomically.
   * @returns The cached result if exists, or `null` (caller should proceed)
   */
  async checkIdempotencyKey(
    key: string,
    _ttlSeconds: number = 86400, // 24 hours (used by setIdempotencyKey)
  ): Promise<string | null> {
    const existing = await this.client.get(`idem:${key}`);
    return existing;
  }

  async setIdempotencyKey(
    key: string,
    result: string,
    ttlSeconds: number = 86400,
  ): Promise<void> {
    await this.client.set(`idem:${key}`, result, "EX", ttlSeconds);
  }

  // ---- Distributed Lock (Redlock) ----
  async withLock<T>(
    resource: string,
    ttl: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.redlock.using([resource], ttl, fn);
  }

  // ---- Cache Helpers ----
  async cacheGet<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(`cache:${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async cacheSet(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(
      `cache:${key}`,
      JSON.stringify(value),
      "EX",
      ttlSeconds,
    );
  }

  async cacheDel(key: string): Promise<void> {
    await this.client.del(`cache:${key}`);
  }

  async cacheDelPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
