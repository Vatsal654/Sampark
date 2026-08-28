/**
 * Purpose: Enforces the @RequirePermission() metadata on admin routes
 * against the RBAC matrix in modules/admin/rbac/permissions.ts.
 * Responsibilities: Runs after AdminAuthGuard (which populates
 * `request.admin`); denies with 403 if the admin's role lacks the
 * required permission or if no admin context is present.
 * Security: Fails closed — a route with no matching admin context, or a
 * permission key not found in PERMISSIONS, is always denied, never
 * default-allowed.
 * Related: common/guards/admin-auth.guard.ts, modules/admin/rbac/permissions.ts.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { roleHasPermission, type PermissionKey } from '../../modules/admin/rbac/permissions';
import type { AdminAuthenticatedRequest } from './admin-auth.guard';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<PermissionKey | undefined>(PERMISSION_KEY, context.getHandler());
    if (!required) return true;

    const request = context.switchToHttp().getRequest<AdminAuthenticatedRequest>();
    if (!request.admin) {
      throw new ForbiddenException('No admin session');
    }
    if (!roleHasPermission(request.admin.role, required)) {
      throw new ForbiddenException(`Role "${request.admin.role}" lacks permission "${required}"`);
    }
    return true;
  }
}
