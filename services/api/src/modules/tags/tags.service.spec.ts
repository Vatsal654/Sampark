import type { Repository } from 'typeorm';
import type { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { AppConfig } from '../../config/config.module';
import type { AuditService } from '../../common/audit/audit.service';
import type { TagActivationChallengeEntity, TagEntity, VehicleEntity } from '../../database/entities';
import { TagsService } from './tags.service';
import { DEV_TAG_ACTIVATION_PIN, DEV_TAG_OPAQUE_ID } from '../../database/seeds/dev-tag-qr';

interface FakeTagsRepo {
  rows: TagEntity[];
  findOne(options: { where: { opaqueId?: string; id?: string } }): Promise<TagEntity | null>;
  save(entity: TagEntity): Promise<TagEntity>;
}

function makeFakeTagsRepo(seed: TagEntity[]): FakeTagsRepo {
  const rows = [...seed];
  return {
    rows,
    findOne: async ({ where }) =>
      rows.find((t) => (where.opaqueId !== undefined ? t.opaqueId === where.opaqueId : t.id === where.id)) ?? null,
    save: async (entity) => {
      const idx = rows.findIndex((r) => r.id === entity.id);
      if (idx >= 0) rows[idx] = entity;
      else rows.push(entity);
      return entity;
    },
  };
}

interface FakeVehiclesRepo {
  findOne(options: { where: { id: string } }): Promise<VehicleEntity | null>;
}

function makeFakeVehiclesRepo(seed: VehicleEntity[]): FakeVehiclesRepo {
  return { findOne: async ({ where }) => seed.find((v) => v.id === where.id) ?? null };
}

function makeFakeChallengesRepo() {
  const rows: TagActivationChallengeEntity[] = [];
  return {
    rows,
    create: (partial: Partial<TagActivationChallengeEntity>) => partial as TagActivationChallengeEntity,
    save: async (entity: TagActivationChallengeEntity) => {
      rows.push(entity);
      return entity;
    },
  };
}

function fakeVehicle(partial: Partial<VehicleEntity>): VehicleEntity {
  return partial as VehicleEntity;
}

function fakeTag(partial: Partial<TagEntity>): TagEntity {
  return partial as TagEntity;
}

function makeService(tagSeed: TagEntity[], vehicleSeed: VehicleEntity[]) {
  const tags = makeFakeTagsRepo(tagSeed);
  const vehicles = makeFakeVehiclesRepo(vehicleSeed);
  const challenges = makeFakeChallengesRepo();
  const auditRecord = jest.fn().mockResolvedValue(undefined);
  const service = new TagsService(
    tags as unknown as Repository<TagEntity>,
    vehicles as unknown as Repository<VehicleEntity>,
    challenges as unknown as Repository<TagActivationChallengeEntity>,
    {} as AppConfig,
    {} as JwtService,
    { record: auditRecord } as unknown as AuditService,
  );
  return { service, tags, vehicles, challenges, auditRecord };
}

describe('TagsService.activate — production behavior (unchanged by the dev-tag tooling)', () => {
  it('activates an issued tag with the correct PIN and associates it with the owner\'s vehicle', async () => {
    const pinHash = await bcrypt.hash('999999', 10);
    const { service, tags } = makeService(
      [fakeTag({ id: 'tag-1', opaqueId: 'aa'.repeat(16), status: 'issued', activationPinHash: pinHash, vehicleId: null, ownerId: null })],
      [fakeVehicle({ id: 'vehicle-1', ownerId: 'owner-1' })],
    );

    const result = await service.activate('owner-1', 'aa'.repeat(16), '999999', 'vehicle-1');

    expect(result).toEqual({ id: 'tag-1', status: 'active', vehicleId: 'vehicle-1' });
    expect(tags.rows[0]?.status).toBe('active');
    expect(tags.rows[0]?.ownerId).toBe('owner-1');
  });

  it('rejects an incorrect PIN without activating the tag', async () => {
    const pinHash = await bcrypt.hash('999999', 10);
    const { service, tags } = makeService(
      [fakeTag({ id: 'tag-1', opaqueId: 'bb'.repeat(16), status: 'issued', activationPinHash: pinHash, vehicleId: null, ownerId: null })],
      [fakeVehicle({ id: 'vehicle-1', ownerId: 'owner-1' })],
    );

    await expect(service.activate('owner-1', 'bb'.repeat(16), '000000', 'vehicle-1')).rejects.toThrow(
      'Invalid activation code',
    );
    expect(tags.rows[0]?.status).toBe('issued');
  });

  it('rejects activating onto a vehicle owned by someone else', async () => {
    const pinHash = await bcrypt.hash('999999', 10);
    const { service } = makeService(
      [fakeTag({ id: 'tag-1', opaqueId: 'cc'.repeat(16), status: 'issued', activationPinHash: pinHash, vehicleId: null, ownerId: null })],
      [fakeVehicle({ id: 'vehicle-1', ownerId: 'someone-else' })],
    );

    await expect(service.activate('owner-1', 'cc'.repeat(16), '999999', 'vehicle-1')).rejects.toThrow('Not your vehicle');
  });

  it('rejects re-activating a tag that is already active', async () => {
    const pinHash = await bcrypt.hash('999999', 10);
    const { service } = makeService(
      [fakeTag({ id: 'tag-1', opaqueId: 'dd'.repeat(16), status: 'active', activationPinHash: pinHash, vehicleId: 'other-vehicle', ownerId: 'owner-1' })],
      [fakeVehicle({ id: 'vehicle-1', ownerId: 'owner-1' })],
    );

    await expect(service.activate('owner-1', 'dd'.repeat(16), '999999', 'vehicle-1')).rejects.toThrow(
      'Tag cannot be activated from status "active"',
    );
  });
});

describe('TagsService.activate — the generated development tag', () => {
  it('activates through the exact same production code path, using the tag shape dev-tag-qr.ts produces', async () => {
    // Mirrors exactly what `npm run dev:tag` writes: status 'issued', activationPinHash for
    // DEV_TAG_ACTIVATION_PIN, no vehicle/owner yet — nothing here is a special case in
    // TagsService.activate() itself, which never imports or knows about dev-tag-qr.ts at all.
    const pinHash = await bcrypt.hash(DEV_TAG_ACTIVATION_PIN, 10);
    const { service, tags } = makeService(
      [fakeTag({ id: 'dev-tag', opaqueId: DEV_TAG_OPAQUE_ID, status: 'issued', activationPinHash: pinHash, vehicleId: null, ownerId: null })],
      [fakeVehicle({ id: 'vehicle-1', ownerId: 'owner-1' })],
    );

    const result = await service.activate('owner-1', DEV_TAG_OPAQUE_ID, DEV_TAG_ACTIVATION_PIN, 'vehicle-1');

    expect(result.status).toBe('active');
    expect(tags.rows[0]?.vehicleId).toBe('vehicle-1');
  });
});
