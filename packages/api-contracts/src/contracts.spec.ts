import { createVehicleSchema } from './vehicle';
import { submitAlertRequestSchema } from './public';
import { requestOtpSchema } from './auth';
import { notificationPreferencesSchema } from './notification-preferences';

describe('createVehicleSchema', () => {
  it('accepts a safe display label', () => {
    const result = createVehicleSchema.safeParse({
      displayLabel: 'Red Scooter',
      category: 'scooter',
      plateNumber: 'BA2PA1234',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a display label that looks like a plate number (PII leak guard)', () => {
    const result = createVehicleSchema.safeParse({
      displayLabel: 'BA 2 PA 1234',
      category: 'car',
      plateNumber: 'BA2PA1234',
    });
    expect(result.success).toBe(false);
  });
});

describe('submitAlertRequestSchema', () => {
  it('accepts a category-only alert with no note or location', () => {
    expect(submitAlertRequestSchema.safeParse({ category: 'lights_on' }).success).toBe(true);
  });

  it('rejects an overly long free-text note', () => {
    const result = submitAlertRequestSchema.safeParse({
      category: 'other',
      note: 'x'.repeat(281),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown category rather than falling through', () => {
    const result = submitAlertRequestSchema.safeParse({ category: 'not_a_real_category' });
    expect(result.success).toBe(false);
  });
});

describe('requestOtpSchema', () => {
  it('rejects a non-Nepali number', () => {
    expect(requestOtpSchema.safeParse({ phoneE164: '+14155552671' }).success).toBe(false);
  });

  it('accepts a normalized Nepali number', () => {
    expect(requestOtpSchema.safeParse({ phoneE164: '+9779812345678' }).success).toBe(true);
  });
});

describe('notificationPreferencesSchema', () => {
  it('defaults emergency bypass of quiet hours to true (life-safety bias)', () => {
    const parsed = notificationPreferencesSchema.parse({ channelOrder: ['push', 'sms'] });
    expect(parsed.emergencyBypassQuietHours).toBe(true);
  });
});
