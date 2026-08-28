/**
 * Purpose: A minimal structured logger that guarantees redaction runs
 * before anything is written to stdout, used by both the API and worker
 * so no module can accidentally bypass redaction by calling console.log
 * with a raw payload.
 * Responsibilities: Emits single-line JSON logs with level, message,
 * timestamp, optional traceId, and a redacted context object.
 * Security: This is the only sanctioned logging entry point per
 * docs/SECURITY.md — application code should depend on this, not on
 * console.* directly, for anything that might carry request context.
 * Related: shared-security/redact.ts.
 */
import { redactForLogging } from './redact';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  traceId?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const line = {
    level,
    message: redactForLogging(message),
    timestamp: new Date().toISOString(),
    ...(context ? { context: redactForLogging(context) } : {}),
  };
  // eslint-disable-next-line no-console -- this is the sanctioned sink
  console.log(JSON.stringify(line));
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
};
