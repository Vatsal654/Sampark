/**
 * Purpose: Signs and verifies the public tag reference embedded in every
 * QR/NFC URL, so a scanner URL cannot be forged or mutated (e.g. to probe
 * a different opaque ID) without the server detecting it.
 * Responsibilities: `signTagReference` computes an HMAC-SHA256 over the
 * opaque ID using the server-held `TAG_SIGNING_SECRET`; `verifyTagSignature`
 * checks it in constant time.
 * Security: The signature is not a secret itself (it's printed on the
 * sticker) — it proves the *pairing* of opaqueId+signature was minted by
 * this server, so an attacker cannot mint a plausible-looking signature
 * for a guessed opaque ID (docs/THREAT_MODEL.md §3.1). Constant-time
 * comparison prevents timing side-channels on signature verification.
 * Related: tag-id.ts, services/api public tags controller.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Computes the URL-safe signature for a given opaque tag ID. */
export function signTagReference(opaqueId: string, signingSecret: string): string {
  return createHmac('sha256', signingSecret).update(opaqueId).digest('base64url');
}

/** Verifies a (opaqueId, signature) pair in constant time. */
export function verifyTagSignature(opaqueId: string, signature: string, signingSecret: string): boolean {
  const expected = signTagReference(opaqueId, signingSecret);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

/** Builds the full scanner-facing path fragment for a tag, e.g. "t/{id}.{sig}". */
export function buildTagPath(opaqueId: string, signingSecret: string): string {
  return `t/${opaqueId}.${signTagReference(opaqueId, signingSecret)}`;
}

/** Parses a "t/{id}.{sig}" style path fragment (or bare "{id}.{sig}") back into parts. */
export function parseTagPath(pathOrFragment: string): { opaqueId: string; signature: string } | null {
  const fragment = pathOrFragment.startsWith('t/') ? pathOrFragment.slice(2) : pathOrFragment;
  const dotIndex = fragment.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === fragment.length - 1) return null;
  return { opaqueId: fragment.slice(0, dotIndex), signature: fragment.slice(dotIndex + 1) };
}
