/**
 * Purpose: Owner vehicle CRUD, always scoped to the authenticated owner.
 * Responsibilities: Create/list/update/delete a vehicle; encrypts/hashes
 * the plate number on write and returns only a masked plate on read.
 * Security: Every method takes `ownerId` from the verified JWT (never
 * from the request body) and every query filters by it — this is the
 * concrete implementation of the "users cannot access another user's
 * vehicle" authorization test in docs' testing requirements.
 * Related: packages/api-contracts/src/vehicle.ts, database/entities/vehicle.entity.ts.
 */
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { decryptField, encryptField, hashForLookup } from '@sampark/shared-security';
import type { CreateVehicle, UpdateVehicle } from '@sampark/api-contracts';
import { TagEntity, VehicleEntity } from '../../database/entities';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(VehicleEntity) private readonly vehicles: Repository<VehicleEntity>,
    @InjectRepository(TagEntity) private readonly tags: Repository<TagEntity>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async create(ownerId: string, input: CreateVehicle) {
    const vehicle = this.vehicles.create({
      ownerId,
      displayLabel: input.displayLabel,
      category: input.category,
      plateNumberEncrypted: encryptField(input.plateNumber, this.config.FIELD_ENCRYPTION_ROOT_KEY),
      plateLookupHash: hashForLookup(input.plateNumber, this.config.FIELD_ENCRYPTION_ROOT_KEY),
      make: input.make ?? null,
      model: input.model ?? null,
      color: input.color ?? null,
    });
    return this.toView(await this.vehicles.save(vehicle), null);
  }

  async list(ownerId: string) {
    const rows = await this.vehicles.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
    const tagRows = rows.length ? await this.tags.find({ where: rows.map((r) => ({ vehicleId: r.id })) }) : [];
    const tagByVehicle = new Map(tagRows.map((t) => [t.vehicleId, t.id]));
    return rows.map((row) => this.toView(row, tagByVehicle.get(row.id) ?? null));
  }

  async getOwned(ownerId: string, vehicleId: string): Promise<VehicleEntity> {
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.ownerId !== ownerId) throw new ForbiddenException('Not your vehicle');
    return vehicle;
  }

  async update(ownerId: string, vehicleId: string, input: UpdateVehicle) {
    const vehicle = await this.getOwned(ownerId, vehicleId);
    if (input.displayLabel !== undefined) vehicle.displayLabel = input.displayLabel;
    if (input.category !== undefined) vehicle.category = input.category;
    if (input.make !== undefined) vehicle.make = input.make ?? null;
    if (input.model !== undefined) vehicle.model = input.model ?? null;
    if (input.color !== undefined) vehicle.color = input.color ?? null;
    if (input.plateNumber !== undefined) {
      vehicle.plateNumberEncrypted = encryptField(input.plateNumber, this.config.FIELD_ENCRYPTION_ROOT_KEY);
      vehicle.plateLookupHash = hashForLookup(input.plateNumber, this.config.FIELD_ENCRYPTION_ROOT_KEY);
    }
    const tag = await this.tags.findOne({ where: { vehicleId: vehicle.id } });
    return this.toView(await this.vehicles.save(vehicle), tag?.id ?? null);
  }

  async remove(ownerId: string, vehicleId: string): Promise<void> {
    const vehicle = await this.getOwned(ownerId, vehicleId);
    await this.vehicles.remove(vehicle);
  }

  private toView(vehicle: VehicleEntity, tagId: string | null) {
    const plate = decryptField(vehicle.plateNumberEncrypted, this.config.FIELD_ENCRYPTION_ROOT_KEY);
    return {
      id: vehicle.id,
      displayLabel: vehicle.displayLabel,
      category: vehicle.category,
      plateNumberMasked: plate.length > 4 ? `${plate.slice(0, 2)}•••${plate.slice(-2)}` : '••••',
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color,
      tagId,
      createdAt: vehicle.createdAt.toISOString(),
    };
  }
}
