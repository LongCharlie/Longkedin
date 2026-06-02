// ============================================================
// ThrottlerGuard — Rate limiting via Redis sliding window
// ============================================================
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request } from "express";

import { RedisService } from "../../redis/redis.service";
import { AuthenticatedUser } from "./auth.guard";

export interface ThrottleConfig {
  limit: number; // max requests
  windowMs: number; // window duration
}

const DEFAULT_LIMIT: ThrottleConfig = { limit: 100, windowMs: 60_000 };

@Injectable()
export class ThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(ThrottlerGuard.name);

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as AuthenticatedUser | undefined;

    // Build rate limit key
    const userId = user?.id || request.ip || "anonymous";
    const endpoint = request.path;
    const key = `rate:user:${userId}:${endpoint}`;

    const { allowed, remaining, resetAt } = await this.redis.checkRateLimit(
      key,
      DEFAULT_LIMIT.limit,
      DEFAULT_LIMIT.windowMs,
    );

    // Set headers for client
    const response = context.switchToHttp().getResponse();
    response.setHeader("X-RateLimit-Limit", DEFAULT_LIMIT.limit);
    response.setHeader("X-RateLimit-Remaining", remaining);
    response.setHeader("X-RateLimit-Reset", Math.ceil(resetAt / 1000));

    if (!allowed) {
      this.logger.warn("Rate limit exceeded", {
        userId,
        endpoint,
        ip: request.ip,
      });
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Too many requests, please try again later",
          retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
