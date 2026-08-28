/**
 * Purpose: Single source of truth for which admin role may perform which
 * action — the actual RBAC enforcement point referenced by
 * docs/SECURITY.md "Authorization".
 * Responsibilities: Maps a permission key (used by @RequirePermission on a
 * controller method) to the set of roles allowed to hold it. Guards check
 * membership here, never a role-name string match against the action.
 * Security: `super_admin` is intentionally listed explicitly on every
 * permission rather than assumed to bypass this table, so a future
 * permission added here can never be silently under-restricted.
 * Related: common/guards/permissions.guard.ts, modules/admin/*.
 */
import type { AdminRole } from '@sampark/api-contracts';

export const PERMISSIONS = {
  'tags.view': ['support_agent', 'operations_agent', 'fraud_reviewer', 'security_admin', 'super_admin'],
  'tags.issue': ['operations_agent', 'super_admin'],
  'tags.suspend': ['operations_agent', 'fraud_reviewer', 'security_admin', 'super_admin'],
  'alerts.view': ['support_agent', 'operations_agent', 'fraud_reviewer', 'security_admin', 'super_admin'],
  'calls.view': ['operations_agent', 'fraud_reviewer', 'security_admin', 'super_admin'],
  'abuse.view': ['fraud_reviewer', 'security_admin', 'super_admin'],
  'abuse.block': ['fraud_reviewer', 'security_admin', 'super_admin'],
  'feature_flags.view': ['operations_agent', 'security_admin', 'super_admin'],
  'feature_flags.update': ['security_admin', 'super_admin'],
  'audit.view': ['security_admin', 'super_admin'],
  'support_tickets.view': ['support_agent', 'operations_agent', 'security_admin', 'super_admin'],
  'break_glass.request': ['support_agent', 'operations_agent', 'fraud_reviewer', 'security_admin', 'super_admin'],
  'break_glass.approve': ['security_admin', 'super_admin'],
} as const satisfies Record<string, readonly AdminRole[]>;

export type PermissionKey = keyof typeof PERMISSIONS;

export function roleHasPermission(role: AdminRole, permission: PermissionKey): boolean {
  return (PERMISSIONS[permission] as readonly AdminRole[]).includes(role);
}
