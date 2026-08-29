import type { Repository } from 'typeorm';
import type { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { ActivateTag } from '@sampark/api-contracts';
import type { AppConfig } from '../../config/config.module';
import type { AuditService } from '../../common/audit/audit.service';
import type { RateLimitService, RateLimitResult } from '../../common/rate-limit/rate-limit.service';
import type { TagActivationChallengeEntity, TagEntity, VehicleEntity } from '../../database/entities';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';

/**
 * This file exists to catch the exact class of bug fixed alongside it: the controller passing
 * `body.replacesTagId` through to TagsService.activate() while the `ActivateTag` type it is
 * declared against (from @sampark/api-contracts) didn't carry that field. A stale/missing build
 * of @sampark/api-contracts reproduces the same "Property 'replacesTagId' does not exist" compile
 * error even when the source is correct — see services/api/package.json's new pre* hooks, which
 * rebuild @sampark/api-contracts before build/start:dev/typecheck/test run against it.
 */

function makeFakeTagsRepo(seed: TagEntity[]) {
  const rows = [...seed];
  return {
    rows,
    findOne: async ({ where }: { where: { opaqueId?: string; id?: string } }) =>
      rows.find((t) => (where.opaqueId !== undefined ? t.opaqueId === where.opaqueId : t.id === where.id)) ?? null,
    save: async (entity: TagEntity) => {
      const idx = rows.findIndex((r) => r.id === entity.id);
      if (idx >= 0) rows[idx] = entity;
      else rows.push(entity);
      return entity;
    },
  };
}

function makeFakeVehiclesRepo(seed: VehicleEntity[]) {
  return { findOne: async ({ where }: { where: { id: string } }) => seed.find((v) => v.id === where.id) ?? null };
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

function makeFakeRateLimit() {
  return {
    consume: async (): Promise<RateLimitResult> => ({ allowed: true, remaining: 4, resetSeconds: 900 }),
  };
}

function fakeVehicle(partial: Partial<VehicleEntity>): VehicleEntity {
  return partial as VehicleEntity;
}

function fakeTag(partial: Partial<TagEntity>): TagEntity {
  return partial as TagEntity;
}

function makeController(tagSeed: TagEntity[], vehicleSeed: VehicleEntity[]) {
  const tags = makeFakeTagsRepo(tagSeed);
  const vehicles = makeFakeVehiclesRepo(vehicleSeed);
  const challenges = makeFakeChallengesRepo();
  const service = new TagsService(
    tags as unknown as Repository<TagEntity>,
    vehicles as unknown as Repository<VehicleEntity>,
    challenges as unknown as Repository<TagActivationChallengeEntity>,
    {} as AppConfig,
    {} as JwtService,
    { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService,
    makeFakeRateLimit() as unknown as RateLimitService,
  );
  return { controller: new TagsController(service), tags };
}

describe('TagsController.activate — ActivateTag contract wiring', () => {
  it('activates a tag when the request body has no replacesTagId (normal activation)', async () => {
    const pinHash = await bcrypt.hash('999999', 10);
    const { controller, tags } = makeController(
      [fakeTag({ id: 'tag-1', opaqueId: 'aa'.repeat(16), status: 'issued', activationPinHash: pinHash, vehicleId: null, ownerId: null })],
      [fakeVehicle({ id: 'vehicle-1', ownerId: 'owner-1' })],
    );
    const body: ActivateTag = { opaqueId: 'aa'.repeat(16), activationPin: '999999', vehicleId: 'vehicle-1' };

    const result = await controller.activate('owner-1', body);

    expect(result).toEqual({ id: 'tag-1', status: 'active', vehicleId: 'vehicle-1' });
    expect(tags.rows[0]?.previousTagId).toBeUndefined();
  });

  it('activates a tag and links it to the replaced tag when the request body includes replacesTagId', async () => {
    const pinHash = await bcrypt.hash('999999', 10);
    const { controller, tags } = makeController(
      [
        fakeTag({ id: 'old-tag', opaqueId: '11'.repeat(16), status: 'replaced', ownerId: 'owner-1' }),
        fakeTag({ id: 'new-tag', opaqueId: '22'.repeat(16), status: 'issued', activationPinHash: pinHash, vehicleId: null, ownerId: null }),
      ],
      [fakeVehicle({ id: 'vehicle-1', ownerId: 'owner-1' })],
    );
    const body: ActivateTag = {
      opaqueId: '22'.repeat(16),
      activationPin: '999999',
      vehicleId: 'vehicle-1',
      replacesTagId: 'old-tag',
    };

    const result = await controller.activate('owner-1', body);

    expect(result).toEqual({ id: 'new-tag', status: 'active', vehicleId: 'vehicle-1' });
    expect(tags.rows.find((t) => t.id === 'new-tag')?.previousTagId).toBe('old-tag');
  });
});
