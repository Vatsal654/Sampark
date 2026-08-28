/**
 * Purpose: Owner support/report-a-problem contracts (product spec §4H).
 */
import { z } from 'zod';

export const createSupportTicketSchema = z.object({
  subject: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
});
export type CreateSupportTicket = z.infer<typeof createSupportTicketSchema>;

export const supportTicketViewSchema = z.object({
  id: z.string().uuid(),
  subject: z.string(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  createdAt: z.string().datetime(),
});
export type SupportTicketView = z.infer<typeof supportTicketViewSchema>;
