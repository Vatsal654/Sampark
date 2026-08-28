/**
 * Purpose: Enumerates the runtime-toggleable feature flags surfaced in the
 * admin console (backed by the `feature_flags` table), distinct from the
 * boot-time env-var flags in env.ts which gate whether a capability can
 * ever be turned on for this deployment at all.
 * Responsibilities: Provides the canonical flag-key list and safe defaults
 * so the database seed, the admin UI, and the API guard all agree.
 * Security: A runtime flag can only be turned on if the corresponding
 * env-var capability flag is also on — see FeatureFlagsService in the API,
 * which enforces `envCapability && runtimeFlag`.
 * Related: services/api/src/modules/admin/feature-flags, apps/admin.
 */
export const FEATURE_FLAG_KEYS = [
  'live_call_bridging',
  'real_sms',
  'real_whatsapp',
  'document_vault',
  'no_tag_lookup',
  'real_payments',
  'maintenance_mode',
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  live_call_bridging: false,
  real_sms: false,
  real_whatsapp: false,
  document_vault: false,
  no_tag_lookup: false,
  real_payments: false,
  maintenance_mode: false,
};
