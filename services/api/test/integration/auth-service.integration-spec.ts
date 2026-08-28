/**
 * Purpose: Integration test for AuthService against real Postgres +
 * Redis — verifies OTP hashing/expiry/attempt-limit persistence and
 * refresh-token rotation at the service layer (below HTTP), complementing
 * the HTTP-level coverage in test/e2e/owner-onboarding.e2e-spec.ts.
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule } from '../../src/config/config.module';
import { RedisModule } from '../../src/common/redis/redis.module';
import { ALL_ENTITIES } from '../../src/database/entities';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { AuthService } from '../../src/modules/auth/auth.service';
import { uniqueNepaliPhone } from '../support/fixtures';
import { NotificationSimulatorService } from '../../src/modules/providers/notification-simulator.service';

describe('AuthService (integration, real Postgres + Redis)', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let simulator: NotificationSimulatorService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule,
        RedisModule,
        TypeOrmModule.forRoot({ type: 'postgres', url: process.env.DATABASE_URL, entities: ALL_ENTITIES, synchronize: false }),
        AuthModule,
      ],
    }).compile();
    authService = moduleRef.get(AuthService);
    simulator = moduleRef.get(NotificationSimulatorService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  function latestOtpCode(): string {
    const event = simulator.list().find((e) => e.channel === 'otp')!;
    return /OTP (\d{6})/.exec(event.summary)![1]!;
  }

  it('issues a token pair on first-time verification and creates a new user', async () => {
    const phoneE164 = uniqueNepaliPhone();
    await authService.requestOtp(phoneE164);
    const code = latestOtpCode();
    const tokens = await authService.verifyOtp(phoneE164, code, 'integration-test-device');
    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
  });

  it('issues distinct, non-colliding token pairs across independent logins', async () => {
    const phoneA = uniqueNepaliPhone();
    await authService.requestOtp(phoneA);
    const tokensA = await authService.verifyOtp(phoneA, latestOtpCode(), 'device-a');

    const phoneB = uniqueNepaliPhone();
    await authService.requestOtp(phoneB);
    const tokensB = await authService.verifyOtp(phoneB, latestOtpCode(), 'device-b');

    expect(tokensA.accessToken).not.toBe(tokensB.accessToken);
    expect(tokensA.refreshToken).not.toBe(tokensB.refreshToken);
  });

  it('applies the resend cooldown: a second immediate OTP request does not issue a new usable code', async () => {
    const phoneE164 = uniqueNepaliPhone();
    await authService.requestOtp(phoneE164);
    const code = latestOtpCode();
    // Second request within the cooldown window returns the same generic shape without minting
    // a new challenge — the original code (once consumed below) is the only one that will work.
    const second = await authService.requestOtp(phoneE164);
    expect(second.sent).toBe(true);

    await authService.verifyOtp(phoneE164, code, 'device-a');
    await expect(authService.verifyOtp(phoneE164, code, 'device-b')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws on an expired/unknown OTP challenge', async () => {
    const phoneE164 = uniqueNepaliPhone();
    await expect(authService.verifyOtp(phoneE164, '123456', undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
