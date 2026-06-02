// ============================================================
// @IdempotencyKey() — Extract idempotency key from headers
// ============================================================
import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const key = request.headers["idempotency-key"] as string;
    if (!key) {
      throw new BadRequestException("Missing Idempotency-Key header");
    }
    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(key)) {
      throw new BadRequestException("Idempotency-Key must be a valid UUID");
    }
    return key;
  },
);
