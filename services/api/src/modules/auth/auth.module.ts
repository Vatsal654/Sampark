/**
 * Purpose: Wires the owner authentication feature module.
 * Related: auth.service.ts, auth.controller.ts.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity, VerifiedPhoneCredentialEntity, UserSessionEntity, OtpChallengeEntity } from '../../database/entities';
import { AuditModule } from '../../common/audit/audit.module';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';
import { ProvidersModule } from '../providers/providers.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, VerifiedPhoneCredentialEntity, UserSessionEntity, OtpChallengeEntity]),
    JwtModule.register({}),
    AuditModule,
    ProvidersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, RateLimitService],
  exports: [AuthService],
})
export class AuthModule {}
