/**
 * Purpose: Owner notification/privacy preference read-modify-write.
 * Responsibilities: Get-or-create semantics so a first-time owner always
 * has a sane default row (per shared-config defaults).
 * Related: database/entities/notification-preference.entity.ts.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { NotificationPreferences } from '@sampark/api-contracts';
import { NotificationPreferenceEntity } from '../../database/entities';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreferenceEntity)
    private readonly repo: Repository<NotificationPreferenceEntity>,
  ) {}

  async get(userId: string): Promise<NotificationPreferences> {
    const row = await this.getOrCreate(userId);
    return this.toView(row);
  }

  async update(userId: string, input: NotificationPreferences): Promise<NotificationPreferences> {
    const row = await this.getOrCreate(userId);
    row.channelOrder = input.channelOrder;
    row.maskedCallsEnabled = input.maskedCallsEnabled;
    row.quietHoursStart = input.quietHoursStart;
    row.quietHoursEnd = input.quietHoursEnd;
    row.emergencyBypassQuietHours = input.emergencyBypassQuietHours;
    row.geoEventRetentionDays = input.geoEventRetentionDays;
    await this.repo.save(row);
    return this.toView(row);
  }

  private async getOrCreate(userId: string): Promise<NotificationPreferenceEntity> {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) return existing;
    return this.repo.save(this.repo.create({ userId }));
  }

  private toView(row: NotificationPreferenceEntity): NotificationPreferences {
    return {
      channelOrder: row.channelOrder,
      maskedCallsEnabled: row.maskedCallsEnabled,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      emergencyBypassQuietHours: row.emergencyBypassQuietHours,
      tagPaused: false,
      geoEventRetentionDays: row.geoEventRetentionDays,
    };
  }
}
