/**
 * Purpose: Ergonomic access to the authenticated admin's id+role inside a
 * controller method, always sourced from the verified admin JWT.
 * Related: common/guards/admin-auth.guard.ts.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AdminAuthenticatedRequest } from '../guards/admin-auth.guard';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): { id: string; role: string } => {
    const request = ctx.switchToHttp().getRequest<AdminAuthenticatedRequest>();
    if (!request.admin) {
      throw new Error('CurrentAdmin used outside of an AdminAuthGuard-protected route');
    }
    return request.admin;
  },
);
