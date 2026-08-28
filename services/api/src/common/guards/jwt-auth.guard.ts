/**
 * Purpose: Authenticates owner-facing requests using the short-lived JWT
 * access token issued by modules/auth.
 * Responsibilities: Extracts `Authorization: Bearer <token>`, verifies its
 * signature/expiry, and attaches `{ id: userId }` to `request.user`.
 * Security: This guard alone proves *authentication*, not *authorization*
 * — every controller must still check resource ownership (see
 * docs/SECURITY.md "Authorization"). Never trusts a user ID from any
 * other source (body/query) when this guard is active.
 * Related: modules/auth/auth.service.ts (token issuance), CurrentUser
 * decorator, ownership checks in modules/vehicles, modules/documents, etc.
 */
import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; sessionId: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length);
    try {
      const payload = this.jwtService.verify<{ sub: string; type: string; sid: string }>(token, {
        secret: this.config.JWT_ACCESS_SECRET,
      });
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Wrong token type');
      }
      request.user = { id: payload.sub, sessionId: payload.sid };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
