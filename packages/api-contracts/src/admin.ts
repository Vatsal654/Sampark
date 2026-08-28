/**
 * Purpose: Admin console contracts (tag inventory, feature flags, audit).
 * Responsibilities: Narrow, redaction-aware view models for staff
 * surfaces — deliberately excludes raw PII fields; the API layer decides
 * per-role whether even these redacted views are visible.
 * Security: `AuditEventView.reason` is required on sensitive actions per
 * docs/SECURITY.md "Admin break-glass" — enforced server-side, mirrored
 * here so the admin UI can require it client-side too.
 * Related: enums.ts, services/api admin module, apps/admin.
 */
import { z } from 'zod';
import { ADMIN_ROLES, TAG_STATUSES } from './enums';

export const adminTagListItemSchema = z.object({
  id: z.string().uuid(),
  opaqueId: z.string(),
  status: z.enum(TAG_STATUSES),
  vehicleDisplayLabel: z.string().nullable(),
  ownerIdMasked: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type AdminTagListItem = z.infer<typeof adminTagListItemSchema>;

export const issueTagRequestSchema = z.object({
  batchReference: z.string().min(1).max(60),
  quantity: z.number().int().min(1).max(1000),
});
export type IssueTagRequest = z.infer<typeof issueTagRequestSchema>;

export const featureFlagViewSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  envCapabilityEnabled: z.boolean(),
  updatedAt: z.string().datetime(),
  updatedByAdminId: z.string().uuid().nullable(),
});
export type FeatureFlagView = z.infer<typeof featureFlagViewSchema>;

export const updateFeatureFlagSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().min(10).max(280),
});
export type UpdateFeatureFlag = z.infer<typeof updateFeatureFlagSchema>;

export const auditEventViewSchema = z.object({
  id: z.string().uuid(),
  actorType: z.enum(['owner', 'admin', 'system', 'scanner']),
  actorIdMasked: z.string().nullable(),
  action: z.string(),
  targetType: z.string(),
  targetIdMasked: z.string().nullable(),
  reason: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type AuditEventView = z.infer<typeof auditEventViewSchema>;

export const breakGlassRequestSchema = z.object({
  targetType: z.enum(['document', 'user_pii', 'call_session']),
  targetId: z.string().uuid(),
  reason: z.string().min(20).max(500),
});
export type BreakGlassRequest = z.infer<typeof breakGlassRequestSchema>;

export const adminRoleSchema = z.enum(ADMIN_ROLES);
