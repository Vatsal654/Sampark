import { isNormalizedNepaliPhone, maskPhoneForDisplay, normalizeNepaliPhone } from './phone';

describe('normalizeNepaliPhone', () => {
  it.each([
    ['+9779812345678', '+9779812345678'],
    ['9779812345678', '+9779812345678'],
    ['9812345678', '+9779812345678'],
    ['09812345678', '+9779812345678'],
    ['+977 981 234 5678', '+9779812345678'],
  ])('normalizes %s -> %s', (input, expected) => {
    expect(normalizeNepaliPhone(input)).toBe(expected);
  });

  it('rejects non-Nepali numbers', () => {
    expect(normalizeNepaliPhone('+14155552671')).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(normalizeNepaliPhone('not-a-phone')).toBeNull();
  });

  it('rejects a too-short landline-shaped number', () => {
    expect(normalizeNepaliPhone('014412345')).toBeNull();
  });
});

describe('isNormalizedNepaliPhone', () => {
  it('accepts a normalized number', () => {
    expect(isNormalizedNepaliPhone('+9779812345678')).toBe(true);
  });
  it('rejects an un-normalized one', () => {
    expect(isNormalizedNepaliPhone('9812345678')).toBe(false);
  });
});

describe('maskPhoneForDisplay', () => {
  it('masks the middle digits', () => {
    expect(maskPhoneForDisplay('+9779812345678')).toBe('+977 98•••••678');
  });
  it('fully masks an invalid number rather than leaking it', () => {
    expect(maskPhoneForDisplay('not-a-phone')).toBe('•••••••••••');
  });
});
