import { isWithinQuietHours } from './quiet-hours';

function utcDate(hh: number, mm: number): Date {
  const d = new Date();
  d.setUTCHours(hh, mm, 0, 0);
  return d;
}

describe('isWithinQuietHours', () => {
  it('returns false when no window is configured', () => {
    expect(isWithinQuietHours(null, null)).toBe(false);
  });

  it('returns true inside a same-day window (Nepal local time)', () => {
    // 22:00 UTC == 03:45 Nepal time (UTC+5:45) the next day.
    const now = utcDate(20, 0); // 01:45 Nepal
    expect(isWithinQuietHours('22:00', '06:00', now)).toBe(true);
  });

  it('returns false outside a same-day window', () => {
    const now = utcDate(6, 0); // 11:45 Nepal
    expect(isWithinQuietHours('22:00', '23:00', now)).toBe(false);
  });

  it('handles a window that does not wrap midnight', () => {
    const now = utcDate(8, 0); // 13:45 Nepal
    expect(isWithinQuietHours('13:00', '14:00', now)).toBe(true);
    expect(isWithinQuietHours('15:00', '16:00', now)).toBe(false);
  });

  it('treats an equal start and end as no quiet hours', () => {
    expect(isWithinQuietHours('10:00', '10:00', utcDate(4, 15))).toBe(false);
  });
});
