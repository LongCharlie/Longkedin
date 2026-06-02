// ============================================================
// IdempotencyService — Prevents duplicate mutations
// Used for: application.create, application.updateStatus, etc.
// ============================================================
import { Injectable, Logger, ConflictException } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly TTL_SECONDS = 86400; // 24 hours

  constructor(private readonly redis: RedisService) {}

  /**
   * Check if an idempotency key has already been processed.
   * If yes, return the cached result.
   * If no, return null (caller should proceed).
   *
   * @param key      The idempotency key (UUID)
   * @param resource A human-readable resource name for logging
   * @returns Cached result or null
   */
  async check<T = unknown>(key: string, resource: string): Promise<T | null> {
    const existing = await this.redis.checkIdempotencyKey(
      key,
      this.TTL_SECONDS,
    );
    if (existing) {
      this.logger.warn(`Idempotency key already processed: ${key}`, {
        resource,
      });
      return JSON.parse(existing) as T;
    }
    return null;
  }

  /**
   * Store the result of an idempotent operation.
   */
  async store(key: string, result: unknown): Promise<void> {
    await this.redis.setIdempotencyKey(
      key,
      JSON.stringify(result),
      this.TTL_SECONDS,
    );
    this.logger.debug(`Stored idempotency key: ${key}`);
  }

  /**
   * Wrap a function with idempotency protection.
   *
   * @example
   * const result = await idempotency.guard(key, 'application.create', async () => {
   *   return prisma.application.create({ data });
   * });
   */
  async guard<T>(
    key: string,
    resource: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.check<T>(key, resource);
    if (cached) {
      throw new ConflictException({
        statusCode: 409,
        message: `This ${resource} request has already been processed`,
        idempotencyKey: key,
        existingResult: cached,
      });
    }

    const result = await fn();
    await this.store(key, result);
    return result;
  }
}
