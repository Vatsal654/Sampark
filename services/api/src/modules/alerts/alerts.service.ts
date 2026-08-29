/**
 * Purpose: Owner-facing alert inbox — list, acknowledge, archive, and
 * report-abuse actions over alerts raised against the owner's vehicles.
 * Responsibilities: Every query is scoped to vehicles owned by the
 * authenticated user; no cross-owner alert can ever be read or mutated.
 * Security: Returns `scannerLocationExact` only when it was captured with
 * scanner consent at submission time (see public-tag.service.ts) — this
 * service does not add any additional exposure.
 * Related: database/entities/alert.entity.ts, packages/api-contracts/src/alert.ts.
 */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { ReportAbuse } from '@sampark/api-contracts';
import { AlertEventEntity, AlertDeliveryEntity, VehicleEntity, AbuseReportEntity } from '../../database/entities';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertEventEntity) private readonly alertEvents: Repository<AlertEventEntity>,
    @InjectRepository(AlertDeliveryEntity) private readonly alertDeliveries: Repository<AlertDeliveryEntity>,
    @InjectRepository(VehicleEntity) private readonly vehicles: Repository<VehicleEntity>,
    @InjectRepository(AbuseReportEntity) private readonly abuseReports: Repository<AbuseReportEntity>,
  ) {}

  async list(ownerId: string) {
    const vehicleIds = await this.ownedVehicleIds(ownerId);
    if (vehicleIds.length === 0) return [];

    const events = await this.alertEvents.find({
      where: { vehicleId: In(vehicleIds) },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const deliveries = await this.alertDeliveries.find({ where: { alertEventId: In(events.map((e) => e.id)) } });
    const deliveriesByEvent = new Map<string, AlertDeliveryEntity[]>();
    for (const delivery of deliveries) {
      const list = deliveriesByEvent.get(delivery.alertEventId) ?? [];
      list.push(delivery);
      deliveriesByEvent.set(delivery.alertEventId, list);
    }

    return events.map((event) => ({
      id: event.id,
      vehicleId: event.vehicleId,
      category: event.category,
      severity: event.severity,
      note: event.note,
      scannerLocationLabel: event.scannerLocationLabel,
      scannerLocationExact: event.scannerLocationExact,
      createdAt: event.createdAt.toISOString(),
      acknowledgedAt: event.acknowledgedAt?.toISOString() ?? null,
      archivedAt: event.archivedAt?.toISOString() ?? null,
      deliveries: (deliveriesByEvent.get(event.id) ?? []).map((d) => ({
        channel: d.channel,
        status: d.status,
        attemptedAt: (d.lastAttemptedAt ?? d.createdAt).toISOString(),
      })),
    }));
  }

  async acknowledge(ownerId: string, alertId: string) {
    const event = await this.getOwned(ownerId, alertId);
    event.acknowledgedAt = new Date();
    await this.alertEvents.save(event);
    return { id: event.id, acknowledgedAt: event.acknowledgedAt.toISOString() };
  }

  async archive(ownerId: string, alertId: string) {
    const event = await this.getOwned(ownerId, alertId);
    event.archivedAt = new Date();
    await this.alertEvents.save(event);
    return { id: event.id, archivedAt: event.archivedAt.toISOString() };
  }

  async unarchive(ownerId: string, alertId: string) {
    const event = await this.getOwned(ownerId, alertId);
    event.archivedAt = null;
    await this.alertEvents.save(event);
    return { id: event.id, archivedAt: null };
  }

  async reportAbuse(ownerId: string, alertId: string, input: ReportAbuse) {
    const event = await this.getOwned(ownerId, alertId);
    event.reportedAsAbuse = true;
    await this.alertEvents.save(event);
    await this.abuseReports.save(
      this.abuseReports.create({
        alertEventId: event.id,
        reportedByUserId: ownerId,
        reason: input.reason,
        note: input.note ?? null,
      }),
    );
    return { received: true as const };
  }

  private async ownedVehicleIds(ownerId: string): Promise<string[]> {
    const vehicles = await this.vehicles.find({ where: { ownerId }, select: ['id'] });
    return vehicles.map((v) => v.id);
  }

  private async getOwned(ownerId: string, alertId: string): Promise<AlertEventEntity> {
    const event = await this.alertEvents.findOne({ where: { id: alertId } });
    if (!event) throw new NotFoundException('Alert not found');
    const vehicle = await this.vehicles.findOne({ where: { id: event.vehicleId } });
    if (!vehicle || vehicle.ownerId !== ownerId) throw new ForbiddenException('Not your alert');
    return event;
  }
}
