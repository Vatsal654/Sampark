/**
 * Purpose: Normalizes Nepali vehicle registration plate numbers to a
 * single canonical uppercase, unspaced form before storage/lookup.
 * Responsibilities: Strips formatting variance (spaces, dashes, case) so
 * "BA 2 PA 1234" and "ba-2-pa-1234" collide to the same keyed-hash lookup
 * value; performs a loose shape check without over-fitting to one embossed
 * plate format (Nepal plates vary by province/category).
 * Security: The normalized value is what gets envelope-encrypted and
 * keyed-hashed by shared-security/crypto.ts — never persist a
 * non-normalized plate string.
 * Related: shared-security/crypto.ts, vehicles module.
 */

/** Loose shape check: letters/digits, 4-10 chars once normalized. Intentionally permissive. */
const PLATE_SHAPE = /^[A-Z0-9]{4,10}$/;

/** Normalizes a plate string for storage/lookup. Returns null if implausible. */
export function normalizePlate(raw: string): string | null {
  const normalized = raw.replace(/[\s-]/g, '').toUpperCase();
  return PLATE_SHAPE.test(normalized) ? normalized : null;
}

/** Formats a normalized plate for display, grouped for readability only — never used as a storage key. */
export function formatPlateForDisplay(normalized: string): string {
  return normalized.replace(/(.{2})(.{1})(.{2})(.*)/, '$1 $2 $3 $4').trim();
}
