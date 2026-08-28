/**
 * Purpose: Declares which RBAC permission key a controller method
 * requires, consumed by PermissionsGuard.
 * Related: modules/admin/rbac/permissions.ts, common/guards/permissions.guard.ts.
 */
import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '../../modules/admin/rbac/permissions';

export const PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (permission: PermissionKey) => SetMetadata(PERMISSION_KEY, permission);
