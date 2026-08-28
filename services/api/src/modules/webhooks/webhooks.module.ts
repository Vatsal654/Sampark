import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderWebhookEventEntity, CallSessionEntity, AlertDeliveryEntity } from '../../database/entities';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderWebhookEventEntity, CallSessionEntity, AlertDeliveryEntity])],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
