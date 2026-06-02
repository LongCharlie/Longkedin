// ============================================================
// ZodValidationPipe — Validate request body with Zod schemas
// Usage: @Body(new ZodValidationPipe(mySchema))
// ============================================================
import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";
import { ZodSchema, ZodError } from "zod";

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodSchema) {}

  transform(value: unknown) {
    if (!this.schema) {
      // Used as global pipe without schema — pass through
      return value;
    }

    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          statusCode: 400,
          message: "Validation failed",
          errors: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      }
      throw error;
    }
  }
}
