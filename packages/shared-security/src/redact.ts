/**
 * Purpose: Strips high-sensitivity patterns (phone numbers, OTP codes,
 * tokens) from any string or structured object before it reaches a log
 * sink, per docs/SECURITY.md "Data protection".
 * Responsibilities: Provides `redactString` for free text and
 * `redactForLogging` for arbitrary objects (deep, cycle-safe), used by the
 * shared logger and by any ad-hoc `console.log` during development.
 * Security: This is a defense-in-depth backstop, not a substitute for not
 * logging sensitive fields in the first place — call sites should still
 * avoid passing raw PII into logs.
 * Related: shared-security/logger.ts, phone.ts (E164_PHONE_PATTERN).
 */
import { E164_PHONE_PATTERN } from './phone';

const OTP_CODE_PATTERN = /\b\d{6}\b/g;
const BEARER_TOKEN_PATTERN = /Bearer\s+[A-Za-z0-9._-]+/gi;

const SENSITIVE_KEY_NAMES = new Set([
  'phone',
  'phonenumber',
  'phone_e164',
  'phonee164',
  'otp',
  'otpcode',
  'code',
  'password',
  'accesstoken',
  'refreshtoken',
  'token',
  'medicalnote',
  'documenturl',
  'plate',
  'platenumber',
]);

/** Redacts phone-shaped numbers, 6-digit OTP-shaped codes, and bearer tokens from free text. */
export function redactString(input: string): string {
  return input
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [redacted]')
    .replace(E164_PHONE_PATTERN, '[redacted-phone]')
    .replace(OTP_CODE_PATTERN, '[redacted-otp]');
}

/**
 * Deep-redacts an arbitrary value for logging: sensitive-named keys are
 * fully masked regardless of value shape, and string values are passed
 * through redactString as a backstop for anything not caught by key name.
 */
export function redactForLogging(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactForLogging(item, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[_-]/g, '');
    if (SENSITIVE_KEY_NAMES.has(normalizedKey)) {
      result[key] = '[redacted]';
    } else {
      result[key] = redactForLogging(val, seen);
    }
  }
  return result;
}
