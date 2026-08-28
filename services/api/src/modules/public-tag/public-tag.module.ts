import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  TagEntity,
  VehicleEntity,
  AlertEventEntity,
  AlertDeliveryEntity,
  OtpChallengeEntity,
  ScanSessionEntity,
  CallSessionEntity,
  AbuseReportEntity,
  NotificationPreferenceEntity,
} from '../../database/entities';
import { AuditModule } from '../../common/audit/audit.module';
import { QueueModule } from '../../common/queue/queue.module';
import { ProvidersModule } from '../providers/providers.module';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';
import { PublicTagService } from './public-tag.service';
import { PublicTagController } from './public-tag.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TagEntity,
      VehicleEntity,
      AlertEventEntity,
      AlertDeliveryEntity,
      OtpChallengeEntity,
      ScanSessionEntity,
      CallSessionEntity,
      AbuseReportEntity,
      NotificationPreferenceEntity,
    ]),
    AuditModule,
    QueueModule,
    ProvidersModule,
  ],
  controllers: [PublicTagController],
  providers: [PublicTagService, RateLimitService],
})
export class PublicTagModule {}
