/**
 * Purpose: Generates and verifies one-time-passcodes for both owner login
 * and scanner masked-call verification, with hashed-at-rest storage.
 * Responsibilities: `generateOtpCode` produces a 6-digit code;
 * `hashOtpCode`/`verifyOtpCode` wrap bcrypt so the plaintext code is never
 * persisted; `OTP_TTL_SECONDS`/`OTP_MAX_ATTEMPTS`/`OTP_RESEND_COOLDOWN_SECONDS`
 * centralize the abuse-control constants referenced by docs/THREAT_MODEL.md
 * §3.6 so the API and tests agree on one source of truth.
 * Security: Never log a plaintext code (redact.ts's OTP_CODE_PATTERN is a
 * backstop, not the primary control) and never return the hash to a
 * client. bcrypt's cost factor is tuned for a 6-digit space where the real
 * protection is attempt-limiting, not hash strength alone.
 * Related: shared-security/redact.ts, services/api auth + public call
 * modules, OtpProvider adapter interface.
 */
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';

export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_SENDS_PER_DAY = 10;

const BCRYPT_ROUNDS = 10;

/** Generates a cryptographically random 6-digit OTP code as a zero-padded string. */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Hashes a plaintext OTP code for storage. */
export async function hashOtpCode(code: string): Promise<string> {
  return bcrypt.hash(code, BCRYPT_ROUNDS);
}

/** Verifies a plaintext OTP code against its stored hash. */
export async function verifyOtpCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}
