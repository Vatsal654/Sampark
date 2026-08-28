/**
 * Purpose: Owner-facing alert inbox contracts.
 * Responsibilities: View model for a delivered alert and the
 * acknowledge/archive/report-abuse action payloads.
 * Security: `scannerLocationLabel` is the only location surfaced by
 * default (coarse); `scannerLocationExact` is present only when the
 * scanner explicitly consented for that specific event. No scanner phone
 * number field exists anywhere in this schema for anonymous alerts.
 * Related: public.ts, enums.ts, services/api alerts module, apps/mobile.
 */
import { z } from 'zod';
import { ALERT_CATEGORIES, ALERT_SEVERITIES, DELIVERY_CHANNELS, DELIVERY_STATUSES } from './enums';
import { geoLocationSchema } from './public';

export const alertDeliveryViewSchema = z.object({
  channel: z.enum(DELIVERY_CHANNELS),
  status: z.enum(DELIVERY_STATUSES),
  attemptedAt: z.string().datetime(),
});
export type AlertDeliveryView = z.infer<typeof alertDeliveryViewSchema>;

export const alertEventViewSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid(),
  category: z.enum(ALERT_CATEGORIES),
  severity: z.enum(ALERT_SEVERITIES),
  note: z.string().nullable(),
  scannerLocationLabel: z.string().nullable(),
  scannerLocationExact: geoLocationSchema.nullable(),
  createdAt: z.string().datetime(),
  acknowledgedAt: z.string().datetime().nullable(),
  archivedAt: z.string().datetime().nullable(),
  deliveries: z.array(alertDeliveryViewSchema),
});
export type AlertEventView = z.infer<typeof alertEventViewSchema>;

export const reportAbuseSchema = z.object({
  reason: z.enum(['harassment', 'spam', 'false_emergency', 'other']),
  note: z.string().max(280).optional(),
});
export type ReportAbuse = z.infer<typeof reportAbuseSchema>;
