/**
 * Purpose: Adapter interface for charging an owner for a tag order,
 * decoupling order placement from any specific Nepal payment gateway.
 * Responsibilities: `charge()` is the only method — a mock always
 * succeeds; the unimplemented-real variant fails loudly until a real
 * merchant account and Nepal payment-compliance review exist.
 * Security: No card/payment-instrument data is ever modeled or accepted
 * here — that stays entirely inside whatever real gateway is eventually
 * integrated (redirect/hosted-fields flow), never touching this backend.
 * Related: orders.service.ts, docs/DECISIONS.md, root README compliance table.
 */
export interface PaymentProvider {
  charge(orderId: string, amountNpr: number): Promise<{ providerReference: string }>;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
