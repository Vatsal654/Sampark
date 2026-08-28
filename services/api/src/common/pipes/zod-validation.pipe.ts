/**
 * Purpose: Validates incoming request bodies against a zod schema,
 * replacing class-validator so every request/response shape is defined
 * exactly once in packages/api-contracts.
 * Responsibilities: Parses `value`, throwing a 400 with field-level
 * detail on failure; returns the parsed (and therefore type-narrowed)
 * value on success.
 * Security: This is the first line of input validation referenced by
 * docs/THREAT_MODEL.md §3.7 (public portal XSS/injection) — every public
 * controller method must apply this pipe to its body.
 * Related: packages/api-contracts, every controller in modules/*.
 */
import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
