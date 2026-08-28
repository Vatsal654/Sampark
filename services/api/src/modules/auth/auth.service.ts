/**
 * Purpose: Owner authentication — phone OTP request/verify, JWT access
 * token issuance, and refresh-token session lifecycle.
 * Responsibilities: Implements the OTP abuse controls from
 * docs/THREAT_MODEL.md §3.6 (identical response regardless of
 * registration status, cooldowns, attempt limits) and issues short-lived
 * access tokens + rotating, revocable refresh tokens.
 * Security: Phone numbers are never stored in plaintext (see
 * VerifiedPhoneCredentialEntity); OTP codes are never stored in plaintext
 * (see OtpChallengeEntity + shared-security/otp.ts); refresh tokens are
 * JWTs but their hash — not the plaintext — is what's persisted, so a
 * stolen DB backup cannot be used to mint sessions.
 * Related: common/guards/jwt-auth.guard.ts, modules/providers,
 * common/rate-limit, common/audit.
 */
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import {
  generateOtpCode,
  hashForLookup,
  hashOtpCode,
  verifyOtpCode,
  encryptField,
  OTP_TTL_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '@sampark/shared-security';
import {
  UserEntity,
  VerifiedPhoneCredentialEntity,
  UserSessionEntity,
  OtpChallengeEntity,
} from '../../database/entities';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';
import { AuditService } from '../../common/audit/audit.service';
import { OTP_PROVIDER, type OtpProvider } from '../providers/otp-provider.interface';

interface RefreshTokenPayload {
  sub: string;
  sid: string;
  type: 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(VerifiedPhoneCredentialEntity)
    private readonly phoneCredentials: Repository<VerifiedPhoneCredentialEntity>,
    @InjectRepository(UserSessionEntity) private readonly sessions: Repository<UserSessionEntity>,
    @InjectRepository(OtpChallengeEntity) private readonly otpChallenges: Repository<OtpChallengeEntity>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
    private readonly jwtService: JwtService,
    private readonly rateLimit: RateLimitService,
    private readonly audit: AuditService,
  ) {}

  async requestOtp(phoneE164: string): Promise<{ sent: true; retryAfterSeconds: number }> {
    const phoneHash = hashForLookup(phoneE164, this.config.FIELD_ENCRYPTION_ROOT_KEY);

    if (await this.rateLimit.isCoolingDown(`otp:cooldown:${phoneHash}`)) {
      // Same response shape whether cooling down or not — no oracle for enumeration or timing.
      return { sent: true, retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS };
    }
    const daily = await this.rateLimit.consume(`otp:daily:${phoneHash}`, 10, 24 * 60 * 60);
    if (!daily.allowed) {
      return { sent: true, retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS };
    }

    const code = generateOtpCode();
    const codeHash = await hashOtpCode(code);
    const challenge = this.otpChallenges.create({
      phoneLookupHash: phoneHash,
      purpose: 'owner_login',
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
    });
    await this.otpChallenges.save(challenge);
    await this.rateLimit.startCooldown(`otp:cooldown:${phoneHash}`, OTP_RESEND_COOLDOWN_SECONDS);

    await this.otpProvider.sendOtp(phoneE164, code);
    return { sent: true, retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS };
  }

  async verifyOtp(
    phoneE164: string,
    code: string,
    deviceName: string | undefined,
  ): Promise<{ accessToken: string; refreshToken: string; accessTokenExpiresAt: string }> {
    const phoneHash = hashForLookup(phoneE164, this.config.FIELD_ENCRYPTION_ROOT_KEY);

    const challenge = await this.otpChallenges.findOne({
      where: { phoneLookupHash: phoneHash, purpose: 'owner_login', consumed: false },
      order: { createdAt: 'DESC' },
    });

    if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    if (challenge.attemptCount >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Too many attempts. Request a new code.');
    }

    const isValid = await verifyOtpCode(code, challenge.codeHash);
    if (!isValid) {
      challenge.attemptCount += 1;
      await this.otpChallenges.save(challenge);
      throw new UnauthorizedException('Invalid or expired code');
    }

    challenge.consumed = true;
    await this.otpChallenges.save(challenge);

    let credential = await this.phoneCredentials.findOne({ where: { phoneLookupHash: phoneHash } });
    let user: UserEntity;
    if (credential) {
      user = await this.users.findOneOrFail({ where: { id: credential.userId } });
    } else {
      user = await this.users.save(this.users.create({}));
      credential = await this.phoneCredentials.save(
        this.phoneCredentials.create({
          userId: user.id,
          phoneEncrypted: encryptField(phoneE164, this.config.FIELD_ENCRYPTION_ROOT_KEY),
          phoneLookupHash: phoneHash,
        }),
      );
      await this.audit.record({ actorType: 'owner', actorId: user.id, action: 'user.registered', targetType: 'user', targetId: user.id });
    }

    return this.issueSessionTokens(user.id, deviceName ?? null);
  }

  private async issueSessionTokens(
    userId: string,
    deviceName: string | null,
  ): Promise<{ accessToken: string; refreshToken: string; accessTokenExpiresAt: string }> {
    const session = await this.sessions.save(
      this.sessions.create({
        userId,
        deviceName,
        refreshTokenHash: 'pending',
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.JWT_REFRESH_TTL_SECONDS * 1000),
      }),
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, sid: session.id, type: 'refresh' } satisfies RefreshTokenPayload,
      { secret: this.config.JWT_REFRESH_SECRET, expiresIn: this.config.JWT_REFRESH_TTL_SECONDS },
    );
    session.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.sessions.save(session);

    const accessToken = this.jwtService.sign(
      { sub: userId, sid: session.id, type: 'access' },
      { secret: this.config.JWT_ACCESS_SECRET, expiresIn: this.config.JWT_ACCESS_TTL_SECONDS },
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + this.config.JWT_ACCESS_TTL_SECONDS * 1000).toISOString(),
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; accessTokenExpiresAt: string }> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, { secret: this.config.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Wrong token type');

    const session = await this.sessions.findOne({ where: { id: payload.sid, userId: payload.sub } });
    if (!session || session.revoked || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Session no longer valid');
    }
    const matches = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!matches) {
      // Presented token doesn't match the latest issued one for this session: possible reuse of a
      // revoked/rotated token. Fail closed and revoke the session defensively.
      session.revoked = true;
      await this.sessions.save(session);
      throw new UnauthorizedException('Refresh token already rotated');
    }

    // Rotate: revoke this session record's token and issue a fresh session (session ID also rotates).
    session.revoked = true;
    await this.sessions.save(session);
    return this.issueSessionTokens(payload.sub, session.deviceName);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.JWT_REFRESH_SECRET,
      });
      await this.sessions.update({ id: payload.sid }, { revoked: true });
    } catch {
      // Already invalid/expired — logout is idempotent, nothing further to do.
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessions.update({ userId, revoked: false }, { revoked: true });
    await this.audit.record({ actorType: 'owner', actorId: userId, action: 'sessions.revoke_all', targetType: 'user', targetId: userId });
  }

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await this.sessions.find({
      where: { userId, revoked: false },
      order: { lastUsedAt: 'DESC' },
    });
    return sessions
      .filter((s) => s.expiresAt.getTime() > Date.now())
      .map((s) => ({
        sessionId: s.id,
        deviceName: s.deviceName,
        createdAt: s.createdAt.toISOString(),
        lastUsedAt: s.lastUsedAt.toISOString(),
        isCurrent: s.id === currentSessionId,
      }));
  }
}
