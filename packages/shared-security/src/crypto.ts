/**
 * Purpose: Field-level envelope encryption and keyed-hash lookup helpers
 * for Sensitive/Critical data (phone numbers, plate numbers, medical
 * notes) per docs/PRIVACY_DATA_MAP.md.
 * Responsibilities: `encryptField`/`decryptField` wrap AES-256-GCM with a
 * random per-call IV; `hashForLookup` produces a deterministic HMAC-SHA256
 * digest so equality lookups (e.g. "does this plate exist?") never require
 * decrypting stored data.
 * Security: The root key passed in must come from a KMS in production
 * (docs/DECISIONS.md ADR-6) — this module treats the key as opaque input
 * and performs no key management itself. Never log plaintext or the root
 * key. Encrypted output is a self-describing string (`v1:<iv>:<tag>:<ct>`)
 * so key/algorithm rotation is possible later without a data migration
 * flag day.
 * Related: services/api/src/modules/*, docs/PRIVACY_DATA_MAP.md.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;
const FORMAT_VERSION = 'v1';

/** Derives a 32-byte key from an arbitrary-length root key string via SHA-256-like stretching. */
function deriveKey(rootKey: string): Buffer {
  return createHmac('sha256', 'sampark-field-encryption').update(rootKey).digest();
}

/** Encrypts `plaintext` with AES-256-GCM using a key derived from `rootKey`. */
export function encryptField(plaintext: string, rootKey: string): string {
  const key = deriveKey(rootKey);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [FORMAT_VERSION, iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(
    ':',
  );
}

/** Decrypts a value produced by encryptField. Throws on tampering (auth tag mismatch) or format mismatch. */
export function decryptField(encoded: string, rootKey: string): string {
  const parts = encoded.split(':');
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error('Unsupported or corrupt encrypted field format');
  }
  const [, ivB64, tagB64, ctB64] = parts as [string, string, string, string];
  const key = deriveKey(rootKey);
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Produces a deterministic keyed hash suitable for equality lookups
 * (e.g. "has this phone number already registered?") without storing or
 * being able to derive the plaintext from the hash.
 */
export function hashForLookup(value: string, rootKey: string): string {
  return createHmac('sha256', deriveKey(rootKey)).update(value).digest('hex');
}
