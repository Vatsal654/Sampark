/**
 * Purpose: Root Nest module wiring every cross-cutting and feature module.
 * Related: main.ts, docs/ARCHITECTURE.md.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, APP_CONFIG, type AppConfig } from './config/config.module';
import { RedisModule } from './common/redis/redis.module';
import { ALL_ENTITIES } from './database/entities';
import { AuthModule } from './modules/auth/auth.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { TagsModule } from './modules/tags/tags.module';
import { PublicTagModule } from './modules/public-tag/public-tag.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { NotificationPreferencesModule } from './modules/notification-preferences/notification-preferences.module';
import { EmergencyModule } from './modules/emergency/emergency.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { NoTagLookupModule } from './modules/no-tag-lookup/no-tag-lookup.module';
import { AdminModule } from './modules/admin/admin.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { HealthModule } from './modules/health/health.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SupportModule } from './modules/support/support.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        type: 'postgres',
        url: config.DATABASE_URL,
        entities: ALL_ENTITIES,
        synchronize: false,
        logging: config.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),
    AuthModule,
    VehiclesModule,
    TagsModule,
    PublicTagModule,
    AlertsModule,
    NotificationPreferencesModule,
    EmergencyModule,
    DocumentsModule,
    PrivacyModule,
    NoTagLookupModule,
    AdminModule,
    WebhooksModule,
    HealthModule,
    ProvidersModule,
    OrdersModule,
    SupportModule,
  ],
})
export class AppModule {}
