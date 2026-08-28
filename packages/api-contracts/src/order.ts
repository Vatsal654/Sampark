/**
 * Purpose: Tag-order/fulfilment contracts (product spec §4H). Payments
 * stay behind a mocked adapter — see modules/orders in services/api and
 * docs/DECISIONS.md.
 */
import { z } from 'zod';

export const createOrderSchema = z.object({
  quantity: z.number().int().min(1).max(20),
});
export type CreateOrder = z.infer<typeof createOrderSchema>;

export const orderViewSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().int(),
  amountNpr: z.number().int(),
  status: z.enum(['pending', 'paid', 'fulfilled', 'cancelled', 'refunded']),
  createdAt: z.string().datetime(),
});
export type OrderView = z.infer<typeof orderViewSchema>;
