import { formatPlateForDisplay, normalizePlate } from './plate';

describe('normalizePlate', () => {
  it('normalizes spacing, dashes, and case', () => {
    expect(normalizePlate('ba-2-pa-1234')).toBe('BA2PA1234');
    expect(normalizePlate('BA 2 PA 1234')).toBe('BA2PA1234');
  });

  it('rejects an implausibly short value', () => {
    expect(normalizePlate('AB')).toBeNull();
  });

  it('rejects special characters', () => {
    expect(normalizePlate('BA2PA1234!')).toBeNull();
  });
});

describe('formatPlateForDisplay', () => {
  it('groups a normalized plate for readability', () => {
    expect(formatPlateForDisplay('BA2PA1234')).toBe('BA 2 PA 1234');
  });
});
