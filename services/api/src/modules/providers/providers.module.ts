/**
 * Purpose: Wires the OtpProvider DI token to either the dev mock or the
 * unimplemented-real placeholder, selected purely by env config, and
 * exposes the notification simulator used by both.
 * Responsibilities: Provider selection logic lives here and nowhere else
 * — no controller/service should import a concrete provider class
 * directly.
 * Related: config/config.module.ts (APP_CONFIG), modules/auth,
 * modules/public-tag.
 */
import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';
import { OTP_PROVIDER } from './otp-provider.interface';
import { MockOtpProvider } from './mock-otp.provider';
import { UnimplementedOtpProvider } from './unimplemented-otp.provider';
import { NotificationSimulatorService } from './notification-simulator.service';
import { NotificationSimulatorController } from './notification-simulator.controller';

@Module({
  controllers: [NotificationSimulatorController],
  providers: [
    NotificationSimulatorService,
    MockOtpProvider,
    UnimplementedOtpProvider,
    {
      provide: OTP_PROVIDER,
      useFactory: (config: AppConfig, mock: MockOtpProvider, unimplemented: UnimplementedOtpProvider) =>
        config.OTP_PROVIDER === 'mock' ? mock : unimplemented,
      inject: [APP_CONFIG, MockOtpProvider, UnimplementedOtpProvider],
    },
  ],
  exports: [OTP_PROVIDER, NotificationSimulatorService],
})
export class ProvidersModule {}
