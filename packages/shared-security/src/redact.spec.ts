import { redactForLogging, redactString } from './redact';

describe('redactString', () => {
  it('redacts an E.164 phone number', () => {
    expect(redactString('call +9779812345678 now')).toBe('call [redacted-phone] now');
  });

  it('redacts a bearer token', () => {
    expect(redactString('Authorization: Bearer abc.def-123_456')).toBe('Authorization: Bearer [redacted]');
  });

  it('redacts a 6-digit OTP-shaped code', () => {
    expect(redactString('your code is 482913')).toBe('your code is [redacted-otp]');
  });

  it('leaves ordinary text untouched', () => {
    expect(redactString('tag paused successfully')).toBe('tag paused successfully');
  });
});

describe('redactForLogging', () => {
  it('masks sensitive keys regardless of value', () => {
    const result = redactForLogging({ phone: '+9779812345678', otp: '123456', label: 'My Car' });
    expect(result).toEqual({ phone: '[redacted]', otp: '[redacted]', label: 'My Car' });
  });

  it('deep-redacts nested objects and arrays', () => {
    const result = redactForLogging({
      users: [{ phoneE164: '+9779812345678', name: 'Owner' }],
    });
    expect(result).toEqual({ users: [{ phoneE164: '[redacted]', name: 'Owner' }] });
  });

  it('handles circular references without throwing', () => {
    const obj: Record<string, unknown> = { name: 'x' };
    obj.self = obj;
    expect(() => redactForLogging(obj)).not.toThrow();
  });

  it('backstops phone-shaped strings even under a non-sensitive key name', () => {
    const result = redactForLogging({ note: 'reach me at +9779812345678' }) as { note: string };
    expect(result.note).toBe('reach me at [redacted-phone]');
  });
});
