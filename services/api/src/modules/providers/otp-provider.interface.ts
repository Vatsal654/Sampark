/**
 * Purpose: Adapter interface for delivering a one-time-passcode to a
 * phone number, decoupling the auth/call-verification flows from any
 * specific SMS/voice aggregator.
 * Responsibilities: A single `sendOtp` method; implementations decide how
 * (SMS, voice call, etc.) as long as they deliver `code` to `phoneE164`.
 * Security: Implementations must never log `code` in plaintext (the
 * shared redaction filter is a backstop, not a substitute for care here).
 * Related: modules/providers/mock-otp.provider.ts, modules/auth,
 * modules/public-tag (call verification), shared-config OTP_PROVIDER flag.
 */
export interface OtpProvider {
  sendOtp(phoneE164: string, code: string): Promise<{ providerMessageId: string }>;
}

export const OTP_PROVIDER = 'OTP_PROVIDER';
