/**
 * Purpose: Owner authentication contracts (phone OTP -> JWT session).
 * Responsibilities: Request/response schemas for OTP request/verify,
 * token refresh, and session listing.
 * Security: `requestOtpResponseSchema` is intentionally identical whether
 * or not the phone number is registered — see docs/THREAT_MODEL.md §3.6.
 * Related: enums.ts, services/api auth module, apps/mobile.
 */
import { z } from 'zod';

export const requestOtpSchema = z.object({
  phoneE164: z.string().regex(/^\+977[9]\d{9}$/, 'Must be a normalized Nepali mobile number'),
});
export type RequestOtp = z.infer<typeof requestOtpSchema>;

/** Always this exact shape, regardless of registration status — no user enumeration oracle. */
export const requestOtpResponseSchema = z.object({
  sent: z.literal(true),
  retryAfterSeconds: z.number().int().positive(),
});
export type RequestOtpResponse = z.infer<typeof requestOtpResponseSchema>;

export const verifyOtpSchema = z.object({
  phoneE164: z.string().regex(/^\+977[9]\d{9}$/),
  code: z.string().regex(/^\d{6}$/),
  deviceName: z.string().max(80).optional(),
});
export type VerifyOtp = z.infer<typeof verifyOtpSchema>;

export const authTokenPairSchema = z.object({
  accessToken: z.string().min(20),
  refreshToken: z.string().min(20),
  accessTokenExpiresAt: z.string().datetime(),
});
export type AuthTokenPair = z.infer<typeof authTokenPairSchema>;

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(20),
});
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;

export const sessionSummarySchema = z.object({
  sessionId: z.string().uuid(),
  deviceName: z.string().nullable(),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime(),
  isCurrent: z.boolean(),
});
export type SessionSummary = z.infer<typeof sessionSummarySchema>;
