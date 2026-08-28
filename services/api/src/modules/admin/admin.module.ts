import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import {
  AdminUserEntity,
  TagEntity,
  TagShipmentEntity,
  AlertEventEntity,
  CallSessionEntity,
  AbuseReportEntity,
  BlockedIdentityEntity,
  FeatureFlagEntity,
  AuditEventEntity,
  SupportTicketEntity,
} from '../../database/entities';
import { AuditModule } from '../../common/audit/audit.module';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUserEntity,
      TagEntity,
      TagShipmentEntity,
      AlertEventEntity,
      CallSessionEntity,
      AbuseReportEntity,
      BlockedIdentityEntity,
      FeatureFlagEntity,
      AuditEventEntity,
      SupportTicketEntity,
    ]),
    JwtModule.register({}),
    AuditModule,
  ],
  controllers: [AdminAuthController, AdminController],
  providers: [AdminAuthService, AdminService],
})
export class AdminModule {}
