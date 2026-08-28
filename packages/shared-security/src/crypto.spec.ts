import { decryptField, encryptField, hashForLookup } from './crypto';

const ROOT_KEY = 'test-root-key-please-do-not-use-in-prod';

describe('encryptField / decryptField', () => {
  it('round-trips plaintext', () => {
    const ciphertext = encryptField('BA 2 PA 1234', ROOT_KEY);
    expect(ciphertext).not.toContain('BA 2 PA 1234');
    expect(decryptField(ciphertext, ROOT_KEY)).toBe('BA 2 PA 1234');
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const a = encryptField('same-value', ROOT_KEY);
    const b = encryptField('same-value', ROOT_KEY);
    expect(a).not.toBe(b);
  });

  it('fails to decrypt with the wrong key', () => {
    const ciphertext = encryptField('secret', ROOT_KEY);
    expect(() => decryptField(ciphertext, 'a-completely-different-key')).toThrow();
  });

  it('detects tampering via the auth tag', () => {
    const ciphertext = encryptField('secret', ROOT_KEY);
    const parts = ciphertext.split(':');
    const tampered = [parts[0], parts[1], parts[2], Buffer.from('tampered-ciphertext').toString('base64')].join(
      ':',
    );
    expect(() => decryptField(tampered, ROOT_KEY)).toThrow();
  });

  it('rejects an unrecognized format instead of silently failing open', () => {
    expect(() => decryptField('not-a-valid-envelope', ROOT_KEY)).toThrow(/format/);
  });
});

describe('hashForLookup', () => {
  it('is deterministic for the same input and key', () => {
    expect(hashForLookup('+9779812345678', ROOT_KEY)).toBe(hashForLookup('+9779812345678', ROOT_KEY));
  });

  it('differs for different inputs', () => {
    expect(hashForLookup('+9779812345678', ROOT_KEY)).not.toBe(hashForLookup('+9779812345679', ROOT_KEY));
  });

  it('does not reveal the plaintext in the output', () => {
    expect(hashForLookup('+9779812345678', ROOT_KEY)).not.toContain('9812345678');
  });
});
