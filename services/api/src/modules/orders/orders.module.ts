import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { OrderEntity } from '../../database/entities';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';
import { PAYMENT_PROVIDER } from './payment-provider.interface';
import { MockPaymentProvider, UnimplementedPaymentProvider } from './mock-payment.provider';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity]), JwtModule.register({})],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    MockPaymentProvider,
    UnimplementedPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (config: AppConfig, mock: MockPaymentProvider, real: UnimplementedPaymentProvider) =>
        config.FEATURE_REAL_PAYMENTS ? real : mock,
      inject: [APP_CONFIG, MockPaymentProvider, UnimplementedPaymentProvider],
    },
  ],
})
export class OrdersModule {}
