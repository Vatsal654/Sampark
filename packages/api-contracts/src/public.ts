/**
 * Purpose: Request/response contracts for the unauthenticated scanner-
 * facing endpoints — the highest-risk surface in the system.
 * Responsibilities: Defines strict, size-capped schemas so the API layer
 * never has to guess what "reasonable" free text looks like.
 * Security: `note` fields are length-capped and the API additionally runs
 * them through a pattern filter (services/api) — this schema is the first
 * line of defense, not the only one. No PII fields exist on any public
 * schema by design.
 * Related: enums.ts, services/api public-tag module, apps/scanner-portal.
 */
import { z } from 'zod';
import { ALERT_CATEGORIES, TAG_STATUSES } from './enums';

export const geoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().max(50_000).optional(),
});
export type GeoLocation = z.infer<typeof geoLocationSchema>;

/** GET /public/tags/:opaqueId response — deliberately owner-PII-free. */
export const publicTagViewSchema = z.object({
  opaqueId: z.string().regex(/^[0-9a-f]{32}$/),
  status: z.enum(TAG_STATUSES),
  vehicleDisplayLabel: z.string().max(60).nullable(),
  vehicleCategory: z.string().nullable(),
  callbackEnabled: z.boolean(),
  emergencyEnabled: z.boolean(),
});
export type PublicTagView = z.infer<typeof publicTagViewSchema>;

export const submitAlertRequestSchema = z.object({
  category: z.enum(ALERT_CATEGORIES),
  note: z.string().max(280).optional(),
  location: geoLocationSchema.optional(),
  abuseToken: z.string().max(4096).optional(),
});
export type SubmitAlertRequest = z.infer<typeof submitAlertRequestSchema>;

export const submitAlertResponseSchema = z.object({
  alertId: z.string().uuid(),
  acknowledged: z.literal(true),
});
export type SubmitAlertResponse = z.infer<typeof submitAlertResponseSchema>;

export const submitEmergencyRequestSchema = z.object({
  note: z.string().max(280).optional(),
  location: geoLocationSchema.optional(),
  confirmedEmergency: z.literal(true),
});
export type SubmitEmergencyRequest = z.infer<typeof submitEmergencyRequestSchema>;

export const reportTagRequestSchema = z.object({
  reason: z.enum(['damaged', 'suspicious_or_cloned', 'other']),
  note: z.string().max(280).optional(),
});
export type ReportTagRequest = z.infer<typeof reportTagRequestSchema>;

export const requestCallOtpSchema = z.object({
  phoneE164: z.string().regex(/^\+977[9]\d{9}$/, 'Must be a normalized Nepali mobile number'),
});
export type RequestCallOtp = z.infer<typeof requestCallOtpSchema>;

export const verifyCallOtpSchema = z.object({
  phoneE164: z.string().regex(/^\+977[9]\d{9}$/),
  code: z.string().regex(/^\d{6}$/),
});
export type VerifyCallOtp = z.infer<typeof verifyCallOtpSchema>;

export const verifyCallOtpResponseSchema = z.object({
  scanSessionToken: z.string().min(20),
  expiresAt: z.string().datetime(),
});
export type VerifyCallOtpResponse = z.infer<typeof verifyCallOtpResponseSchema>;

export const requestMaskedCallSchema = z.object({
  scanSessionToken: z.string().min(20),
  consentToConnect: z.literal(true),
});
export type RequestMaskedCall = z.infer<typeof requestMaskedCallSchema>;

export const maskedCallSessionSchema = z.object({
  callSessionId: z.string().uuid(),
  status: z.enum(['pending', 'ringing', 'connected', 'ended', 'failed', 'expired']),
  expiresAt: z.string().datetime(),
});
export type MaskedCallSession = z.infer<typeof maskedCallSessionSchema>;
