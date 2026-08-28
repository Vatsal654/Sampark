import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderWebhookEventEntity, CallSessionEntity } from '../../database/entities';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderWebhookEventEntity, CallSessionEntity])],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
