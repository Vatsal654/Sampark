import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { TagEntity, VehicleEntity, TagActivationChallengeEntity } from '../../database/entities';
import { AuditModule } from '../../common/audit/audit.module';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TagEntity, VehicleEntity, TagActivationChallengeEntity]),
    JwtModule.register({}),
    AuditModule,
  ],
  controllers: [TagsController],
  providers: [TagsService, RateLimitService],
  exports: [TagsService],
})
export class TagsModule {}
