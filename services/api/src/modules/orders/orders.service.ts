/**
 * Purpose: Owner tag-order placement (product spec §4H), payment kept
 * behind PaymentProvider so no real charge happens without a configured
 * gateway and FEATURE_REAL_PAYMENTS enabled.
 * Security: `charge()` failing (e.g. real payments disabled) leaves the
 * order in `pending` — never silently marks it paid.
 * Related: payment-provider.interface.ts, database/entities/order.entity.ts.
 */
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from '../../database/entities';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.interface';

/** Fictional development-only pricing — a real deployment reads this from a product catalogue. */
const TAG_PRICE_NPR = 499;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

  async create(userId: string, quantity: number) {
    const amountNpr = TAG_PRICE_NPR * quantity;
    const order = await this.orders.save(this.orders.create({ userId, quantity, amountNpr, status: 'pending' }));

    try {
      const { providerReference } = await this.paymentProvider.charge(order.id, amountNpr);
      order.status = 'paid';
      order.paymentReference = providerReference;
      await this.orders.save(order);
    } catch {
      // Payment provider unavailable/disabled — order stays pending rather than silently failing open.
    }

    return this.toView(order);
  }

  async list(userId: string) {
    const rows = await this.orders.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toView(row));
  }

  private toView(order: OrderEntity) {
    return {
      id: order.id,
      quantity: order.quantity,
      amountNpr: order.amountNpr,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    };
  }
}
