import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminAuthGuard, type AdminAuthenticatedRequest } from './admin-auth.guard';
import type { AppConfig } from '../../config/config.module';

function makeContext(request: Partial<AdminAuthenticatedRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function makeConfig(overrides: Partial<AppConfig>): AppConfig {
  return { NODE_ENV: 'development', ADMIN_AUTH_DISABLED: false, ...overrides } as AppConfig;
}

describe('AdminAuthGuard — ADMIN_AUTH_DISABLED bypass', () => {
  const jwtService = new JwtService({});

  it('rejects an unauthenticated request when the bypass is off', () => {
    const guard = new AdminAuthGuard(jwtService, makeConfig({ ADMIN_AUTH_DISABLED: false }));
    const request: AdminAuthenticatedRequest = { headers: {} } as AdminAuthenticatedRequest;
    expect(() => guard.canActivate(makeContext(request))).toThrow(UnauthorizedException);
  });

  it('attaches a synthetic super_admin and allows the request when the bypass is on (dev)', () => {
    const guard = new AdminAuthGuard(
      jwtService,
      makeConfig({ ADMIN_AUTH_DISABLED: true, NODE_ENV: 'development' }),
    );
    const request: AdminAuthenticatedRequest = { headers: {} } as AdminAuthenticatedRequest;
    expect(guard.canActivate(makeContext(request))).toBe(true);
    expect(request.admin).toEqual({ id: 'dev-bypass-admin', role: 'super_admin' });
  });

  it('never honors the bypass when NODE_ENV=production, even if the flag is set', () => {
    const guard = new AdminAuthGuard(
      jwtService,
      makeConfig({ ADMIN_AUTH_DISABLED: true, NODE_ENV: 'production' }),
    );
    const request: AdminAuthenticatedRequest = { headers: {} } as AdminAuthenticatedRequest;
    expect(() => guard.canActivate(makeContext(request))).toThrow(UnauthorizedException);
  });
});
