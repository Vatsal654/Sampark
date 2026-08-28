import { buildTagPath, parseTagPath, signTagReference, verifyTagSignature } from './tag-signature';
import { generateOpaqueTagId } from './tag-id';

const SECRET = 'tag-signing-secret-for-tests';

describe('tag signature', () => {
  it('produces a signature that verifies against the same opaque id', () => {
    const id = generateOpaqueTagId();
    const sig = signTagReference(id, SECRET);
    expect(verifyTagSignature(id, sig, SECRET)).toBe(true);
  });

  it('rejects a signature for a different opaque id (enumeration defense)', () => {
    const idA = generateOpaqueTagId();
    const idB = generateOpaqueTagId();
    const sigForA = signTagReference(idA, SECRET);
    expect(verifyTagSignature(idB, sigForA, SECRET)).toBe(false);
  });

  it('rejects a signature produced with a different secret', () => {
    const id = generateOpaqueTagId();
    const sig = signTagReference(id, 'wrong-secret');
    expect(verifyTagSignature(id, sig, SECRET)).toBe(false);
  });

  it('round-trips through buildTagPath / parseTagPath', () => {
    const id = generateOpaqueTagId();
    const path = buildTagPath(id, SECRET);
    const parsed = parseTagPath(path);
    expect(parsed).not.toBeNull();
    expect(parsed?.opaqueId).toBe(id);
    expect(verifyTagSignature(parsed!.opaqueId, parsed!.signature, SECRET)).toBe(true);
  });

  it('parseTagPath returns null for malformed fragments', () => {
    expect(parseTagPath('no-dot-here')).toBeNull();
    expect(parseTagPath('id.')).toBeNull();
  });
});
