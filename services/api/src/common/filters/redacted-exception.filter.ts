/**
 * Purpose: Global exception filter ensuring no error response or log line
 * leaks a stack trace, raw SQL, or PII to the client or to stdout.
 * Responsibilities: Maps any thrown error to a safe HTTP response shape
 * and logs a redacted summary server-side.
 * Security: Per docs/THREAT_MODEL.md §3.5, error messages must never
 * contain a phone number or token — `logger.error` here goes through the
 * shared redaction transform, and the client-facing body never includes
 * `error.stack`.
 * Related: packages/shared-security/logger.ts, main.ts.
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { logger } from '@sampark/shared-security';

@Catch()
export class RedactedExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException
      ? exception.getResponse()
      : { message: 'An unexpected error occurred. Please try again.' };

    logger.error('Unhandled request error', {
      status,
      message: exception instanceof Error ? exception.message : String(exception),
    });

    response.status(status).json(typeof body === 'string' ? { message: body } : body);
  }
}
