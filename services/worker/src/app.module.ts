/**
 * Purpose: Root module for the Sampark worker process.
 * Related: main.ts, docs/ARCHITECTURE.md.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, WORKER_CONFIG, type WorkerConfig } from './config/config.module';
import { QueueModule } from './queue/queue.module';
import { ProvidersModule } from './providers/providers.module';
import { WORKER_ENTITIES } from './database/entities';
import { NotificationDeliveryProcessor } from './jobs/notification-delivery.processor';
import { CallBridgeProcessor } from './jobs/call-bridge.processor';
import { RetentionJob } from './jobs/retention.job';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [WORKER_CONFIG],
      useFactory: (config: WorkerConfig) => ({
        type: 'postgres',
        url: config.DATABASE_URL,
        entities: WORKER_ENTITIES,
        synchronize: false,
        logging: config.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),
    TypeOrmModule.forFeature(WORKER_ENTITIES),
    QueueModule,
    ProvidersModule,
  ],
  providers: [NotificationDeliveryProcessor, CallBridgeProcessor, RetentionJob],
})
export class AppModule {}
