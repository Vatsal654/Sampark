/**
 * Purpose: Authenticates admin console requests using the admin session
 * JWT issued after mock-SSO + MFA login (modules/admin/auth).
 * Responsibilities: Verifies the token, checks it is an "admin" typed
 * token (never accepts an owner access token here), and attaches
 * `{ id, role }` to `request.admin`.
 * Security: Admin and owner tokens are signed with the same secret but
 * carry a distinct `type` claim specifically so an owner token can never
 * be replayed against an admin route or vice versa.
 * TEMPORARY: when `ADMIN_AUTH_DISABLED=true`, this guard skips the token
 * check entirely and attaches a synthetic super_admin identity instead —
 * an explicit, opt-in bypass for early local testing of the admin console
 * without wiring up login first (apps/admin's middleware/proxy route have
 * a matching bypass, gated by the same env var, that must also be set for
 * this to work end-to-end). Refuses to honor the flag at all when
 * NODE_ENV==='production', so a stray/accidental setting can never
 * disable real admin auth in a real deployment. Revert by unsetting
 * ADMIN_AUTH_DISABLED (or removing this block) once real admin login is
 * being exercised again.
 * Related: common/guards/permissions.guard.ts, modules/admin/auth,
 * apps/admin/middleware.ts, apps/admin/app/api/admin/[...path]/route.ts.
 */
import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AdminRole } from '@sampark/api-contracts';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';

export interface AdminAuthenticatedRequest extends Request {
  admin?: { id: string; role: AdminRole };
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminAuthenticatedRequest>();

    if (this.config.ADMIN_AUTH_DISABLED && this.config.NODE_ENV !== 'production') {
      request.admin = { id: 'dev-bypass-admin', role: 'super_admin' };
      return true;
    }

    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length);
    try {
      const payload = this.jwtService.verify<{ sub: string; type: string; role: AdminRole }>(token, {
        secret: this.config.JWT_ACCESS_SECRET,
      });
      if (payload.type !== 'admin') {
        throw new UnauthorizedException('Wrong token type');
      }
      request.admin = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired admin session');
    }
  }
}
