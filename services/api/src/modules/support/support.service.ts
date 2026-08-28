/**
 * Purpose: Owner "report a problem" / support-ticket creation and
 * listing (product spec §4H). Admin-side triage lives in
 * modules/admin/admin.service.ts#listSupportTickets.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicketEntity } from '../../database/entities';

@Injectable()
export class SupportService {
  constructor(@InjectRepository(SupportTicketEntity) private readonly tickets: Repository<SupportTicketEntity>) {}

  async create(userId: string, subject: string, description: string) {
    const ticket = await this.tickets.save(this.tickets.create({ userId, subject, description, status: 'open' }));
    return { id: ticket.id, subject: ticket.subject, status: ticket.status, createdAt: ticket.createdAt.toISOString() };
  }

  async list(userId: string) {
    const rows = await this.tickets.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return rows.map((row) => ({ id: row.id, subject: row.subject, status: row.status, createdAt: row.createdAt.toISOString() }));
  }
}
