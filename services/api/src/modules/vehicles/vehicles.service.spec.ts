import type { Repository } from 'typeorm';
import type { CreateVehicle, UpdateVehicle } from '@sampark/api-contracts';
import type { AppConfig } from '../../config/config.module';
import type { TagEntity, VehicleEntity } from '../../database/entities';
import { VehiclesService } from './vehicles.service';

const ROOT_KEY = 'test-field-encryption-root-key-32chars!!';

interface FakeVehiclesRepo {
  rows: VehicleEntity[];
  create(partial: Partial<VehicleEntity>): VehicleEntity;
  save(entity: VehicleEntity): Promise<VehicleEntity>;
  find(options?: { where?: { ownerId?: string } }): Promise<VehicleEntity[]>;
  findOne(options: { where: { id: string } }): Promise<VehicleEntity | null>;
  remove(entity: VehicleEntity): Promise<VehicleEntity>;
}

function makeFakeVehiclesRepo(): FakeVehiclesRepo {
  let idCounter = 0;
  const rows: VehicleEntity[] = [];
  return {
    rows,
    create: (partial) =>
      ({ id: `vehicle-${++idCounter}`, createdAt: new Date(), updatedAt: new Date(), ...partial }) as VehicleEntity,
    save: async (entity) => {
      const idx = rows.findIndex((r) => r.id === entity.id);
      if (idx >= 0) rows[idx] = entity;
      else rows.push(entity);
      return entity;
    },
    find: async (options) => rows.filter((r) => !options?.where || r.ownerId === options.where.ownerId),
    findOne: async (options) => rows.find((r) => r.id === options.where.id) ?? null,
    remove: async (entity) => {
      const idx = rows.findIndex((r) => r.id === entity.id);
      if (idx >= 0) rows.splice(idx, 1);
      return entity;
    },
  };
}

interface FakeTagsRepo {
  rows: TagEntity[];
  find(options?: { where?: { vehicleId: string } | { vehicleId: string }[] }): Promise<TagEntity[]>;
  findOne(options: { where: { vehicleId: string } }): Promise<TagEntity | null>;
}

function makeFakeTagsRepo(seed: TagEntity[] = []): FakeTagsRepo {
  const rows = [...seed];
  return {
    rows,
    find: async (options) => {
      const where = options?.where;
      if (Array.isArray(where)) {
        const ids = new Set(where.map((w) => w.vehicleId));
        return rows.filter((t) => t.vehicleId !== null && ids.has(t.vehicleId));
      }
      return rows.filter((t) => !where || t.vehicleId === where.vehicleId);
    },
    findOne: async (options) => rows.find((t) => t.vehicleId === options.where.vehicleId) ?? null,
  };
}

function makeService(tagSeed: TagEntity[] = []) {
  const vehicles = makeFakeVehiclesRepo();
  const tags = makeFakeTagsRepo(tagSeed);
  const config = { FIELD_ENCRYPTION_ROOT_KEY: ROOT_KEY } as unknown as AppConfig;
  const service = new VehiclesService(
    vehicles as unknown as Repository<VehicleEntity>,
    tags as unknown as Repository<TagEntity>,
    config,
  );
  return { service, vehicles, tags };
}

function fakeTag(partial: Partial<TagEntity>): TagEntity {
  return partial as TagEntity;
}

const FULL_INPUT: CreateVehicle = {
  displayLabel: 'Blue Scooter',
  category: 'scooter',
  plateNumber: 'BA1PA1234',
  make: 'Honda',
  model: 'Dio',
  variant: 'STD',
  manufacturingYear: 2022,
  fuelType: 'petrol',
  color: 'Blue',
  vinNumber: 'MH1JF5115K1234567',
  engineNumber: 'JF51E1234567',
};

describe('VehiclesService', () => {
  it('create() persists every detail field and returns them, with no tag yet', async () => {
    const { service } = makeService();
    const view = await service.create('owner-1', FULL_INPUT);

    expect(view.displayLabel).toBe('Blue Scooter');
    expect(view.make).toBe('Honda');
    expect(view.model).toBe('Dio');
    expect(view.variant).toBe('STD');
    expect(view.manufacturingYear).toBe(2022);
    expect(view.fuelType).toBe('petrol');
    expect(view.color).toBe('Blue');
    expect(view.vinNumber).toBe('MH1JF5115K1234567');
    expect(view.engineNumber).toBe('JF51E1234567');
    expect(view.tagId).toBeNull();
    expect(view.tagStatus).toBeNull();
    // The full plate is never returned — only a masked form derived from it.
    expect(view.plateNumberMasked).toBe('BA•••34');
    expect(Object.keys(view)).not.toContain('plateNumber');
  });

  it('create() leaves unset optional fields null rather than inventing a default', async () => {
    const { service } = makeService();
    const view = await service.create('owner-1', {
      displayLabel: 'Bare Bones',
      category: 'car',
      plateNumber: 'BA2CH0001',
    });

    expect(view.make).toBeNull();
    expect(view.variant).toBeNull();
    expect(view.manufacturingYear).toBeNull();
    expect(view.fuelType).toBeNull();
    expect(view.vinNumber).toBeNull();
    expect(view.engineNumber).toBeNull();
  });

  it('list() attaches the associated tag id and status when one exists', async () => {
    const { service, vehicles } = makeService([fakeTag({ id: 'tag-1', vehicleId: 'vehicle-1', status: 'active' })]);
    await service.create('owner-1', FULL_INPUT);
    vehicles.rows[0]!.id = 'vehicle-1'; // pin the id the fake tag row references

    const views = await service.list('owner-1');
    expect(views).toHaveLength(1);
    expect(views[0]?.tagId).toBe('tag-1');
    expect(views[0]?.tagStatus).toBe('active');
  });

  it('update() only changes the fields provided, leaving the rest untouched', async () => {
    const { service } = makeService();
    const created = await service.create('owner-1', FULL_INPUT);

    const patch: UpdateVehicle = { color: 'Red', manufacturingYear: 2023 };
    const updated = await service.update('owner-1', created.id, patch);

    expect(updated.color).toBe('Red');
    expect(updated.manufacturingYear).toBe(2023);
    // Untouched fields survive the partial update.
    expect(updated.make).toBe('Honda');
    expect(updated.model).toBe('Dio');
    expect(updated.vinNumber).toBe('MH1JF5115K1234567');
  });

  it('update() rejects a vehicle owned by someone else', async () => {
    const { service } = makeService();
    const created = await service.create('owner-1', FULL_INPUT);

    await expect(service.update('owner-2', created.id, { color: 'Green' })).rejects.toThrow('Not your vehicle');
  });

  it('getOne() returns the same detail + tag shape as list()', async () => {
    const { service, vehicles } = makeService([fakeTag({ id: 'tag-1', vehicleId: 'vehicle-1', status: 'paused' })]);
    await service.create('owner-1', FULL_INPUT);
    vehicles.rows[0]!.id = 'vehicle-1';

    const view = await service.getOne('owner-1', 'vehicle-1');
    expect(view.tagId).toBe('tag-1');
    expect(view.tagStatus).toBe('paused');
  });

  it('remove() deletes the vehicle so a subsequent getOne() 404s', async () => {
    const { service } = makeService();
    const created = await service.create('owner-1', FULL_INPUT);

    await service.remove('owner-1', created.id);

    await expect(service.getOne('owner-1', created.id)).rejects.toThrow('Vehicle not found');
  });
});
