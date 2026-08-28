import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AlertEventEntity, AlertDeliveryEntity, VehicleEntity, AbuseReportEntity } from '../../database/entities';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertEventEntity, AlertDeliveryEntity, VehicleEntity, AbuseReportEntity]),
    JwtModule.register({}),
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
