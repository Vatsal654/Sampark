/**
 * Purpose: Owner vehicle CRUD, always scoped to the authenticated owner.
 * Responsibilities: Create/list/update/delete a vehicle; encrypts/hashes
 * the plate number on write and decrypts it back to plaintext on every
 * owner-authenticated read (toView) — the owner is always shown their
 * own full plate, never masked to themselves.
 * Security: Every method takes `ownerId` from the verified JWT (never
 * from the request body) and every query filters by it — this is the
 * concrete implementation of the "users cannot access another user's
 * vehicle" authorization test in docs' testing requirements. The
 * decrypted plate returned here must NEVER reach a scanner-facing
 * response — see public-tag.service.ts, which has no vehicle-plate
 * field of any kind, masked or full.
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
      variant: input.variant ?? null,
      manufacturingYear: input.manufacturingYear ?? null,
      fuelType: input.fuelType ?? null,
      color: input.color ?? null,
      vinNumber: input.vinNumber ?? null,
      engineNumber: input.engineNumber ?? null,
    });
    return this.toView(await this.vehicles.save(vehicle), null);
  }

  async list(ownerId: string) {
    const rows = await this.vehicles.find({ where: { ownerId }, order: { createdAt: 'DESC' } });
    const tagRows = rows.length ? await this.tags.find({ where: rows.map((r) => ({ vehicleId: r.id })) }) : [];
    const tagByVehicle = new Map(tagRows.map((t) => [t.vehicleId, t]));
    return rows.map((row) => this.toView(row, tagByVehicle.get(row.id) ?? null));
  }

  async getOne(ownerId: string, vehicleId: string) {
    const vehicle = await this.getOwned(ownerId, vehicleId);
    const tag = await this.tags.findOne({ where: { vehicleId: vehicle.id } });
    return this.toView(vehicle, tag ?? null);
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
    if (input.variant !== undefined) vehicle.variant = input.variant ?? null;
    if (input.manufacturingYear !== undefined) vehicle.manufacturingYear = input.manufacturingYear ?? null;
    if (input.fuelType !== undefined) vehicle.fuelType = input.fuelType ?? null;
    if (input.color !== undefined) vehicle.color = input.color ?? null;
    if (input.vinNumber !== undefined) vehicle.vinNumber = input.vinNumber ?? null;
    if (input.engineNumber !== undefined) vehicle.engineNumber = input.engineNumber ?? null;
    if (input.plateNumber !== undefined) {
      vehicle.plateNumberEncrypted = encryptField(input.plateNumber, this.config.FIELD_ENCRYPTION_ROOT_KEY);
      vehicle.plateLookupHash = hashForLookup(input.plateNumber, this.config.FIELD_ENCRYPTION_ROOT_KEY);
    }
    const tag = await this.tags.findOne({ where: { vehicleId: vehicle.id } });
    return this.toView(await this.vehicles.save(vehicle), tag ?? null);
  }

  async remove(ownerId: string, vehicleId: string): Promise<void> {
    const vehicle = await this.getOwned(ownerId, vehicleId);
    await this.vehicles.remove(vehicle);
  }

  private toView(vehicle: VehicleEntity, tag: TagEntity | null) {
    const plate = decryptField(vehicle.plateNumberEncrypted, this.config.FIELD_ENCRYPTION_ROOT_KEY);
    return {
      id: vehicle.id,
      displayLabel: vehicle.displayLabel,
      category: vehicle.category,
      plateNumber: plate,
      plateNumberMasked: plate.length > 4 ? `${plate.slice(0, 2)}•••${plate.slice(-2)}` : '••••',
      make: vehicle.make,
      model: vehicle.model,
      variant: vehicle.variant,
      manufacturingYear: vehicle.manufacturingYear,
      fuelType: vehicle.fuelType,
      color: vehicle.color,
      vinNumber: vehicle.vinNumber,
      engineNumber: vehicle.engineNumber,
      tagId: tag?.id ?? null,
      tagStatus: tag?.status ?? null,
      createdAt: vehicle.createdAt.toISOString(),
    };
  }
}
