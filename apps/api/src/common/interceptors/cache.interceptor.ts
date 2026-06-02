// ============================================================
// CacheInterceptor — Redis response caching
// Usage: @UseInterceptors(CacheInterceptor) with @CacheTTL(60)
// ============================================================
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, of, tap } from "rxjs";
import { Request } from "express";
import { RedisService } from "../../redis/redis.service";

// Metadata key set by @CacheTTL decorator
export const CACHE_TTL_KEY = "cache:ttl";
export const CACHE_KEY_PREFIX = "cache:route:";

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();

    // Only cache GET requests
    if (request.method !== "GET") {
      return next.handle();
    }

    // Build cache key from user ID + path + query
    const user = (request as any).user;
    const userId = user?.id || "anonymous";
    const cacheKey = `${CACHE_KEY_PREFIX}${userId}:${request.path}:${JSON.stringify(request.query)}`;

    // Try cache
    const cached = await this.redis.cacheGet<unknown>(cacheKey);
    if (cached !== null) {
      return of(cached); // Return cached response immediately
    }

    // Cache miss — execute handler and cache result
    const ttl = 60; // Default 60s, can be overridden via metadata
    return next.handle().pipe(
      tap(async (data) => {
        await this.redis.cacheSet(cacheKey, data, ttl);
      }),
    );
  }
}
