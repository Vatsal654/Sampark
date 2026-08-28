/**
 * Purpose: Normalizes and validates phone numbers so every layer of the
 * system stores and compares the exact same canonical representation.
 * Responsibilities: Accepts common Nepali input formats (with/without
 * +977, with leading 0, with spaces/dashes) and returns strict E.164, or
 * null if the input cannot be confidently normalized.
 * Security: This is the canonical shape a phone number must be in before
 * it is hashed, encrypted, or handed to a provider — never send provider
 * calls with un-normalized user input.
 * Related: shared-security/crypto.ts (encryptField/hashForLookup), auth
 * OTP flow, redact.ts (E164_PHONE_PATTERN must match this shape).
 */

/** Matches a normalized Nepali E.164 mobile number, e.g. +9779812345678. */
export const NEPAL_E164_PATTERN = /^\+977(9\d{9})$/;

/** Matches any E.164-shaped number, used defensively by the log redactor. */
export const E164_PHONE_PATTERN = /\+\d{8,15}/g;

/**
 * Normalizes a user-entered Nepali mobile number to E.164.
 * Accepts: "+9779812345678", "9779812345678", "9812345678", "09812345678",
 * with optional spaces/dashes. Returns null for anything else, deliberately
 * — callers must treat null as "reject", not "guess".
 */
export function normalizeNepaliPhone(raw: string): string | null {
  const stripped = raw.replace(/[\s-]/g, '');
  let candidate: string;

  if (stripped.startsWith('+977')) {
    candidate = stripped;
  } else if (stripped.startsWith('977')) {
    candidate = `+${stripped}`;
  } else if (stripped.startsWith('0')) {
    candidate = `+977${stripped.slice(1)}`;
  } else if (/^9\d{9}$/.test(stripped)) {
    candidate = `+977${stripped}`;
  } else {
    return null;
  }

  return NEPAL_E164_PATTERN.test(candidate) ? candidate : null;
}

/** True if `value` is already a valid normalized Nepali E.164 number. */
export function isNormalizedNepaliPhone(value: string): boolean {
  return NEPAL_E164_PATTERN.test(value);
}

/** Masks a phone number for the rare UI surface allowed to show a hint (e.g. "+977 98•••••678"). */
export function maskPhoneForDisplay(e164: string): string {
  if (!isNormalizedNepaliPhone(e164)) return '•••••••••••';
  const country = e164.slice(0, 4);
  const first2 = e164.slice(4, 6);
  const last3 = e164.slice(-3);
  return `${country} ${first2}•••••${last3}`;
}
