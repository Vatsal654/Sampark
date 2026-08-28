import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { NoTagLookupRequestEntity } from '../../database/entities';
import { AuditModule } from '../../common/audit/audit.module';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';
import { NoTagLookupService } from './no-tag-lookup.service';
import { NoTagLookupController } from './no-tag-lookup.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NoTagLookupRequestEntity]), JwtModule.register({}), AuditModule],
  controllers: [NoTagLookupController],
  providers: [NoTagLookupService, RateLimitService],
})
export class NoTagLookupModule {}
