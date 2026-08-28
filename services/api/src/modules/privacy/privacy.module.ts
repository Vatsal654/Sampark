import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConsentEntity, UserEntity, VehicleEntity, VerifiedPhoneCredentialEntity } from '../../database/entities';
import { AuditModule } from '../../common/audit/audit.module';
import { PrivacyService } from './privacy.service';
import { PrivacyController } from './privacy.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConsentEntity, UserEntity, VehicleEntity, VerifiedPhoneCredentialEntity]),
    JwtModule.register({}),
    AuditModule,
  ],
  controllers: [PrivacyController],
  providers: [PrivacyService],
})
export class PrivacyModule {}
