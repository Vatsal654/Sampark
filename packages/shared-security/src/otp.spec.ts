import { generateOtpCode, hashOtpCode, verifyOtpCode } from './otp';

describe('OTP helpers', () => {
  it('generates a zero-padded 6-digit code', () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('hashes and verifies correctly', async () => {
    const code = '048213';
    const hash = await hashOtpCode(code);
    expect(hash).not.toContain(code);
    await expect(verifyOtpCode(code, hash)).resolves.toBe(true);
  });

  it('rejects an incorrect code', async () => {
    const hash = await hashOtpCode('111111');
    await expect(verifyOtpCode('222222', hash)).resolves.toBe(false);
  });
});
