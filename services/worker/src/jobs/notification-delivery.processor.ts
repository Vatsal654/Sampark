/**
 * Purpose: Consumes `deliver-alert` and `deliver-emergency` jobs from the
 * `notifications` queue and delivers push → WhatsApp → SMS in the owner's
 * configured order, per docs/DATA_FLOW.md §2/§4.
 * Responsibilities: Loads the alert + vehicle + owner preferences,
 * respects quiet hours (bypassed for emergencies only if the owner
 * enabled that), attempts channels in order until one succeeds, and
 * writes an AlertDeliveryEntity outcome for every channel it touches.
 * Security: Never includes a phone number in job data or log output —
 * only IDs are passed through the queue; the owner's phone is decrypted
 * only momentarily, in-memory, to hand to a provider call.
 * Related: providers/*, jobs/quiet-hours.ts, database/entities.ts.
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Job } from 'bullmq';
import { decryptField, logger } from '@sampark/shared-security';
import { NOTIFICATIONS_QUEUE } from '../queue/queue.module';
import { WORKER_CONFIG, type WorkerConfig } from '../config/config.module';
import {
  AlertEventEntity,
  AlertDeliveryEntity,
  VehicleEntity,
  NotificationPreferenceEntity,
  EmergencyContactEntity,
} from '../database/entities';
import { isWithinQuietHours } from './quiet-hours';
import { SMS_PROVIDER, type SmsProvider } from '../providers/sms.provider';
import { WHATSAPP_PROVIDER, type WhatsAppProvider } from '../providers/whatsapp.provider';
import { PUSH_PROVIDER, type PushProvider } from '../providers/push.provider';

const ALERT_CATEGORY_LABELS: Record<string, string> = {
  blocking_access: 'blocking access',
  lights_on: 'lights left on',
  window_or_door_open: 'a window or door open',
  being_towed: 'being towed',
  accident_emergency: 'an accident/emergency',
  parking_concern: 'a parking concern',
  other: 'an issue',
};

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationDeliveryProcessor extends WorkerHost {
  constructor(
    @InjectRepository(AlertEventEntity) private readonly alertEvents: Repository<AlertEventEntity>,
    @InjectRepository(AlertDeliveryEntity) private readonly alertDeliveries: Repository<AlertDeliveryEntity>,
    @InjectRepository(VehicleEntity) private readonly vehicles: Repository<VehicleEntity>,
    @InjectRepository(NotificationPreferenceEntity) private readonly preferences: Repository<NotificationPreferenceEntity>,
    @InjectRepository(EmergencyContactEntity) private readonly emergencyContacts: Repository<EmergencyContactEntity>,
    @Inject(WORKER_CONFIG) private readonly config: WorkerConfig,
    @Inject(SMS_PROVIDER) private readonly smsProvider: SmsProvider,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsappProvider: WhatsAppProvider,
    @Inject(PUSH_PROVIDER) private readonly pushProvider: PushProvider,
  ) {
    super();
  }

  async process(job: Job<{ alertEventId: string }>): Promise<void> {
    const { alertEventId } = job.data;
    const alertEvent = await this.alertEvents.findOne({ where: { id: alertEventId } });
    if (!alertEvent) {
      logger.warn('Notification job referenced an unknown alert event', { alertEventId });
      return;
    }
    const vehicle = await this.vehicles.findOne({ where: { id: alertEvent.vehicleId } });
    if (!vehicle) return;

    const preferences = await this.preferences.findOne({ where: { userId: vehicle.ownerId } });
    const channelOrder = preferences?.channelOrder ?? ['push', 'whatsapp', 'sms'];
    const emergencyBypass = preferences?.emergencyBypassQuietHours ?? true;
    const inQuietHours = isWithinQuietHours(preferences?.quietHoursStart ?? null, preferences?.quietHoursEnd ?? null);
    const suppressAudibleChannels = inQuietHours && !(alertEvent.severity === 'emergency' && emergencyBypass);

    const deliveries = await this.alertDeliveries.find({ where: { alertEventId } });
    const deliveryByChannel = new Map(deliveries.map((d) => [d.channel, d]));
    const categoryLabel = ALERT_CATEGORY_LABELS[alertEvent.category] ?? 'an alert';
    const title = alertEvent.severity === 'emergency' ? 'Sampark emergency alert' : 'Sampark vehicle alert';
    const body = `Your vehicle "${vehicle.displayLabel}" may have ${categoryLabel}.`;

    let delivered = false;
    for (const channel of channelOrder) {
      const delivery = deliveryByChannel.get(channel);
      if (!delivery) continue;

      if (delivered) {
        delivery.status = 'skipped';
        await this.alertDeliveries.save(delivery);
        continue;
      }
      if (channel !== 'push' && suppressAudibleChannels) {
        delivery.status = 'skipped';
        delivery.failureReason = 'Suppressed during owner quiet hours';
        await this.alertDeliveries.save(delivery);
        continue;
      }

      try {
        if (channel === 'push') {
          await this.pushProvider.send(vehicle.ownerId, title, 'You have a Sampark vehicle alert.');
        } else if (channel === 'whatsapp') {
          await this.whatsappProvider.sendTemplate(vehicle.ownerId, 'sampark_alert_v1', delivery.id);
        } else if (channel === 'sms') {
          await this.smsProvider.send(vehicle.ownerId, body, delivery.id);
        } else {
          delivery.status = 'skipped';
          delivery.failureReason = 'Email channel not implemented';
          await this.alertDeliveries.save(delivery);
          continue;
        }
        delivery.status = 'sent';
        delivery.attemptCount += 1;
        delivery.lastAttemptedAt = new Date();
        await this.alertDeliveries.save(delivery);
        delivered = true;
      } catch (error) {
        delivery.status = 'failed';
        delivery.failureReason = error instanceof Error ? error.message : 'Unknown provider error';
        delivery.attemptCount += 1;
        delivery.lastAttemptedAt = new Date();
        await this.alertDeliveries.save(delivery);
      }
    }

    if (alertEvent.severity === 'emergency') {
      await this.notifyEmergencyContacts(vehicle.ownerId, body);
    }
  }

  private async notifyEmergencyContacts(ownerId: string, body: string): Promise<void> {
    const contacts = await this.emergencyContacts.find({ where: { userId: ownerId } });
    for (const contact of contacts) {
      try {
        const phone = decryptField(contact.phoneEncrypted, this.config.FIELD_ENCRYPTION_ROOT_KEY);
        await this.smsProvider.send(phone, `Sampark emergency: ${body}`, `emergency-contact-${contact.id}`);
      } catch (error) {
        logger.error('Failed to notify emergency contact', { error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
}
