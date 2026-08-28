/**
 * Purpose: Ergonomic access to the authenticated owner's ID inside a
 * controller method, always sourced from the verified JWT (never from
 * client-supplied body/query), so ownership checks can't be bypassed by
 * an attacker passing a different userId in the payload.
 * Related: common/guards/jwt-auth.guard.ts.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';

export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.user) {
    throw new Error('CurrentUserId used outside of a JwtAuthGuard-protected route');
  }
  return request.user.id;
});
