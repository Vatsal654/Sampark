/**
 * Purpose: Owner consent-recording contract.
 * Related: enums.ts (CONSENT_TYPES), modules/privacy.
 */
import { z } from 'zod';
import { CONSENT_TYPES } from './enums';

export const recordConsentSchema = z.object({
  consentType: z.enum(CONSENT_TYPES),
  granted: z.boolean(),
});
export type RecordConsent = z.infer<typeof recordConsentSchema>;

export const deleteAccountRequestSchema = z.object({
  confirm: z.literal(true),
});
export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>;
