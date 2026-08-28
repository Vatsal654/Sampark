/**
 * Purpose: Owner notification/privacy preference contract, covering
 * channel toggles, quiet hours, and tag pause state referenced throughout
 * the product spec (§4D).
 * Responsibilities: One schema shared by the settings screen and the
 * worker's delivery-order decision logic, so "what the owner asked for"
 * and "what the worker honors" can never silently diverge.
 * Security: `emergencyBypassQuietHours` defaults to true (life-safety
 * bias) but is explicitly owner-controlled, never silently overridden.
 * Related: services/api owner-preferences module, services/worker
 * notification decision logic, apps/mobile.
 */
import { z } from 'zod';
import { DELIVERY_CHANNELS } from './enums';

export const notificationPreferencesSchema = z.object({
  channelOrder: z.array(z.enum(DELIVERY_CHANNELS)).min(1),
  maskedCallsEnabled: z.boolean().default(true),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().default(null),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().default(null),
  emergencyBypassQuietHours: z.boolean().default(true),
  tagPaused: z.boolean().default(false),
  geoEventRetentionDays: z.number().int().min(1).max(365).default(90),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
