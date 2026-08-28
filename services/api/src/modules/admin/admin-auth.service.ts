/**
 * Purpose: Admin console login — mock SSO + MFA in development, with the
 * adapter seam for a real OIDC provider documented for production.
 * Responsibilities: `login` looks up a seeded admin_users row by email,
 * checks a 6-digit MFA code, and issues a short-lived admin JWT carrying
 * the admin's role.
 * Security: This mock intentionally accepts any syntactically valid
 * 6-digit MFA code — it exists to exercise the RBAC/session code paths in
 * local development ONLY. `ADMIN_MOCK_SSO_ENABLED` must be false (and a
 * real OIDC + TOTP integration substituted) before any production
 * deployment; see docs/DEPLOYMENT.md.
 * Related: common/guards/admin-auth.guard.ts, database/entities/admin.entity.ts.
 */
import { Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AdminUserEntity } from '../../database/entities';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminUserEntity) private readonly adminUsers: Repository<AdminUserEntity>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, mfaCode: string): Promise<{ accessToken: string; expiresAt: string }> {
    if (!this.config.ADMIN_MOCK_SSO_ENABLED && this.config.NODE_ENV !== 'test') {
      throw new ServiceUnavailableException(
        'Mock admin SSO is disabled. A real OIDC provider must be configured for this environment.',
      );
    }
    if (!/^\d{6}$/.test(mfaCode)) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    const admin = await this.adminUsers.findOne({ where: { email, active: true } });
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ttlSeconds = 30 * 60;
    const accessToken = this.jwtService.sign(
      { sub: admin.id, type: 'admin', role: admin.role },
      { secret: this.config.JWT_ACCESS_SECRET, expiresIn: ttlSeconds },
    );
    return { accessToken, expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString() };
  }
}
