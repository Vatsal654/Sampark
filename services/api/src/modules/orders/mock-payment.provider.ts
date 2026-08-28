/**
 * Purpose: Development-only PaymentProvider — always succeeds, never
 * talks to a real gateway. Paired with UnimplementedPaymentProvider,
 * selected by FEATURE_REAL_PAYMENTS (see orders.module.ts).
 * Related: payment-provider.interface.ts.
 */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { logger } from '@sampark/shared-security';
import type { PaymentProvider } from './payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  async charge(orderId: string, amountNpr: number): Promise<{ providerReference: string }> {
    logger.info('Mock payment charge (dev only, no real money moved)', { orderId, amountNpr });
    return { providerReference: `mock-payment-${crypto.randomUUID()}` };
  }
}

@Injectable()
export class UnimplementedPaymentProvider implements PaymentProvider {
  async charge(): Promise<{ providerReference: string }> {
    throw new ForbiddenException(
      'Real payments are not enabled on this deployment — no merchant account or Nepal payment-compliance review exists yet.',
    );
  }
}
