/**
 * Purpose: Canonical enums shared by every client and the backend so a
 * status string can never drift between, say, the API's Postgres enum and
 * the scanner portal's UI switch statement.
 * Responsibilities: Defines every lifecycle/category/role enum referenced
 * across the product spec.
 * Security: Enum membership itself is not sensitive; what's sensitive is
 * making sure every consumer treats an unrecognized value as "unknown/
 * deny" rather than falling through to a default-allow branch.
 * Related: every module in this package; services/api entities; apps/*.
 */

export const VEHICLE_CATEGORIES = ['car', 'bike', 'scooter', 'taxi', 'commercial', 'other'] as const;
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

export const TAG_STATUSES = [
  'manufactured',
  'issued',
  'pending_activation',
  'active',
  'paused',
  'reported_lost',
  'revoked',
  'replaced',
] as const;
export type TagStatus = (typeof TAG_STATUSES)[number];

export const ALERT_CATEGORIES = [
  'blocking_access',
  'lights_on',
  'window_or_door_open',
  'being_towed',
  'accident_emergency',
  'parking_concern',
  'other',
] as const;
export type AlertCategory = (typeof ALERT_CATEGORIES)[number];

export const ALERT_SEVERITIES = ['normal', 'emergency'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const DELIVERY_CHANNELS = ['push', 'whatsapp', 'sms', 'email'] as const;
export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number];

export const DELIVERY_STATUSES = ['queued', 'sent', 'delivered', 'failed', 'skipped'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const CALL_SESSION_STATUSES = [
  'pending',
  'ringing',
  'connected',
  'ended',
  'failed',
  'expired',
] as const;
export type CallSessionStatus = (typeof CALL_SESSION_STATUSES)[number];

export const ADMIN_ROLES = [
  'support_agent',
  'operations_agent',
  'fraud_reviewer',
  'security_admin',
  'super_admin',
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const CONSENT_TYPES = [
  'privacy_policy',
  'terms_of_service',
  'marketing',
  'notifications',
  'location',
  'emergency_profile_visibility',
  'document_storage',
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export const DOCUMENT_TYPES = ['rc', 'driving_licence', 'insurance', 'puc_emissions', 'other'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const SUPPORTED_LOCALES = ['en', 'ne'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
