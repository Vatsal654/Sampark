/**
 * Purpose: Generates and validates the opaque public identifiers used in
 * scanner-facing tag URLs, defeating sequential-ID enumeration
 * (docs/THREAT_MODEL.md §3.1).
 * Responsibilities: `generateOpaqueTagId` returns a high-entropy,
 * non-sequential, URL-safe identifier; `isPlausibleOpaqueTagId` cheaply
 * rejects malformed input before it reaches the database or signature
 * check, so obviously-invalid scans don't consume a rate-limit budget
 * doing real work.
 * Security: This ID is intentionally public (printed on the sticker,
 * embedded in the QR). It carries no information about the owner or
 * vehicle; unforgeability against tampering is provided separately by
 * tag-signature.ts, not by this ID's entropy alone.
 * Related: tag-signature.ts, services/api tags module.
 */
import { randomBytes } from 'node:crypto';

const OPAQUE_ID_BYTE_LENGTH = 16; // 128 bits of entropy
const OPAQUE_ID_PATTERN = /^[0-9a-f]{32}$/;

/** Generates a new 128-bit random opaque tag identifier, hex-encoded. */
export function generateOpaqueTagId(): string {
  return randomBytes(OPAQUE_ID_BYTE_LENGTH).toString('hex');
}

/** Cheap shape check before a DB lookup or signature verification is attempted. */
export function isPlausibleOpaqueTagId(value: string): boolean {
  return OPAQUE_ID_PATTERN.test(value);
}
