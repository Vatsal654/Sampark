import { activateTagSchema, createVehicleSchema, vehicleViewSchema } from './vehicle';
import { publicTagViewSchema, submitAlertRequestSchema } from './public';
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

describe('vehicleViewSchema — owner-authenticated only', () => {
  it('carries the full plate alongside the masked form (owner can see their own plate in full)', () => {
    const result = vehicleViewSchema.safeParse({
      id: '11111111-1111-1111-1111-111111111111',
      displayLabel: 'Red Scooter',
      category: 'scooter',
      plateNumber: 'BA2PA1234',
      plateNumberMasked: 'BA•••34',
      make: null,
      model: null,
      variant: null,
      manufacturingYear: null,
      fuelType: null,
      color: null,
      vinNumber: null,
      engineNumber: null,
      tagId: null,
      tagStatus: null,
      createdAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
});

describe('publicTagViewSchema — scanner-facing, must never carry a plate', () => {
  it('has no plateNumber or plateNumberMasked field at all, in either direction', () => {
    // A structural guarantee, not just "we happen not to send it": if a future edit ever adds a
    // plate field to the owner-only vehicleViewSchema and someone copies a field list across by
    // habit, this test fails immediately rather than silently shipping a scanner-facing plate leak.
    expect(Object.keys(publicTagViewSchema.shape)).not.toContain('plateNumber');
    expect(Object.keys(publicTagViewSchema.shape)).not.toContain('plateNumberMasked');
  });
});

describe('activateTagSchema', () => {
  it('accepts an activation with no replacesTagId (the normal case)', () => {
    const result = activateTagSchema.safeParse({
      opaqueId: 'a'.repeat(32),
      activationPin: '123456',
      vehicleId: '11111111-1111-1111-1111-111111111111',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional replacesTagId for the reported-lost -> replaced lineage', () => {
    const result = activateTagSchema.safeParse({
      opaqueId: 'a'.repeat(32),
      activationPin: '123456',
      vehicleId: '11111111-1111-1111-1111-111111111111',
      replacesTagId: '22222222-2222-2222-2222-222222222222',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a replacesTagId that is not a UUID', () => {
    const result = activateTagSchema.safeParse({
      opaqueId: 'a'.repeat(32),
      activationPin: '123456',
      vehicleId: '11111111-1111-1111-1111-111111111111',
      replacesTagId: 'not-a-uuid',
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
