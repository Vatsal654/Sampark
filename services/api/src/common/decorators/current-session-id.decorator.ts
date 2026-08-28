/**
 * Purpose: Access to the current session ID embedded in the verified
 * access token, used to compute "is this the session making the request"
 * without trusting any client-supplied session identifier.
 * Related: common/guards/jwt-auth.guard.ts.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';

export const CurrentSessionId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.user) {
    throw new Error('CurrentSessionId used outside of a JwtAuthGuard-protected route');
  }
  return request.user.sessionId;
});
