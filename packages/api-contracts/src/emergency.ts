/**
 * Purpose: Emergency profile and emergency-contact contracts.
 * Responsibilities: Owner-editable minimal medical/emergency card, with
 * every field individually opt-in for scanner visibility.
 * Security: `emergencyCardViewForScanner` is a distinct, narrower schema
 * from the owner's editable profile — the API must never reuse the owner
 * schema to serve the scanner-facing emergency endpoint.
 * Related: services/api emergency module, apps/mobile, apps/scanner-portal.
 */
import { z } from 'zod';

export const emergencyContactSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(60),
  phoneE164: z.string().regex(/^\+977[9]\d{9}$/),
  relationship: z.string().max(40).optional(),
});
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;

export const emergencyProfileSchema = z.object({
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).default('unknown'),
  allergiesNote: z.string().max(280).nullable(),
  safeInstructions: z.string().max(280).nullable(),
  shareBloodGroup: z.boolean().default(false),
  shareAllergies: z.boolean().default(false),
  shareSafeInstructions: z.boolean().default(false),
  shareContactsWithResponders: z.boolean().default(true),
});
export type EmergencyProfile = z.infer<typeof emergencyProfileSchema>;

/** What a scanner may see, and only after confirming a genuine emergency — never the full profile. */
export const emergencyCardViewForScannerSchema = z.object({
  bloodGroup: z.string().nullable(),
  allergiesNote: z.string().nullable(),
  safeInstructions: z.string().nullable(),
  seekEmergencyServicesFirst: z.literal(true),
});
export type EmergencyCardViewForScanner = z.infer<typeof emergencyCardViewForScannerSchema>;
