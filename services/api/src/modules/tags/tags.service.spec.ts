import type { Repository } from 'typeorm';
import type { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import type { AppConfig } from '../../config/config.module';
import type { AuditService, RecordAuditEventInput } from '../../common/audit/audit.service';
import type { RateLimitService, RateLimitResult } from '../../common/rate-limit/rate-limit.service';
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

function makeFakeRateLimit(allowed = true) {
  const calls: string[] = [];
  return {
    calls,
    consume: async (key: string): Promise<RateLimitResult> => {
      calls.push(key);
      return { allowed, remaining: allowed ? 4 : 0, resetSeconds: 900 };
    },
  };
}

function fakeVehicle(partial: Partial<VehicleEntity>): VehicleEntity {
  return partial as VehicleEntity;
}

function fakeTag(partial: Partial<TagEntity>): TagEntity {
  return partial as TagEntity;
}

function makeService(
  tagSeed: TagEntity[],
  vehicleSeed: VehicleEntity[],
  options?: { rateLimitAllowed?: boolean },
) {
  const tags = makeFakeTagsRepo(tagSeed);
  const vehicles = makeFakeVehiclesRepo(vehicleSeed);
  const challenges = makeFakeChallengesRepo();
  const auditRecord = jest.fn().mockResolvedValue(undefined);
  const rateLimiter = makeFakeRateLimit(options?.rateLimitAllowed ?? true);
  const service = new TagsService(
    tags as unknown as Repository<TagEntity>,
    vehicles as unknown as Repository<VehicleEntity>,
    challenges as unknown as Repository<TagActivationChallengeEntity>,
    {} as AppConfig,
    {} as JwtService,
    { record: auditRecord } as unknown as AuditService,
    rateLimiter as unknown as RateLimitService,
  );
  return { service, tags, vehicles, challenges, auditRecord, rateLimiter };
}

function auditActions(auditRecord: jest.Mock): string[] {
  return auditRecord.mock.calls.map((call) => (call[0] as RecordAuditEventInput).action);
}

describe('TagsService.activate — production behavior (unchanged by the dev-tag tooling)', () => {
  it('activates an issued tag with the correct PIN and associates it with the owner\'s vehicle', async () => {
    const pinHash = await bcrypt.hash('999999', 10);
    const { service, tags, auditRecord } = makeService(
      [fakeTag({ id: 'tag-1', opaqueId: 'aa'.repeat(16), status: 'issued', activationPinHash: pinHash, vehicleId: null, ownerId: null })],
      [fakeVehicle({ id: 'vehicle-1', ownerId: 'owner-1' })],
    );

    const result = await service.activate('owner-1', 'aa'.repeat(16), '999999', 'vehicle-1');

    expect(result).toEqual({ id: 'tag-1', status: 'active', vehicleId: 'vehicle-1' });
    expect(tags.rows[0]?.status).toBe('active');
    expect(tags.rows[0]?.ownerId).toBe('owner-1');
    expect(auditActions(auditRecord)).toContain('tag.activated');
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

  for (const status of ['revoked', 'replaced', 'reported_lost'] as const) {
    it(`rejects activating a ${status} tag`, async () => {
      const pinHash = await bcrypt.hash('999999', 10);
      const { service } = makeService(
        [fakeTag({ id: 'tag-1', opaqueId: 'ee'.repeat(16), status, activationPinHash: pinHash, vehicleId: null, ownerId: null })],
        [fakeVehicle({ id: 'vehicle-1', ownerId: 'owner-1' })],
      );

      await expect(service.activate('owner-1', 'ee'.repeat(16), '999999', 'vehicle-1')).rejects.toThrow(
        `Tag cannot be activated from status "${status}"`,
      );
    });
  }

  it('rejects activation once the per-tag attempt budget is exhausted, before even checking the PIN', async () => {
    const pinHash = await bcrypt.hash('999999', 10);
    const { service, tags } = makeService(
      [fakeTag({ id: 'tag-1', opaqueId: 'ff'.repeat(16), status: 'issued', activationPinHash: pinHash, vehicleId: null, ownerId: null })],
      [fakeVehicle({ id: 'vehicle-1', ownerId: 'owner-1' })],
      { rateLimitAllowed: false },
    );

    await expect(service.activate('owner-1', 'ff'.repeat(16), '999999', 'vehicle-1')).rejects.toThrow(
      'Too many activation attempts',
    );
    // The correct PIN was supplied but the tag must still be untouched — the rate limit is
    // checked first, so a locked-out attacker can never distinguish "right PIN, rate-limited"
    // from "wrong PIN, rate-limited" by timing/response shape.
    expect(tags.rows[0]?.status).toBe('issued');
  });

  it('links a replacement activation to the tag it replaces, only when that tag is actually "replaced" and owned by the same caller', async () => {
    const pinHash = await bcrypt.hash('999999', 10);
    const { service, tags, auditRecord } = makeService(
      [
        fakeTag({ id: 'old-tag', opaqueId: '11'.repeat(16), status: 'replaced', ownerId: 'owner-1' }),
        fakeTag({ id: 'new-tag', opaqueId: '22'.repeat(16), status: 'issued', activationPinHash: pinHash, vehicleId: null, ownerId: null }),
      ],
      [fakeVehicle({ id: 'vehicle-1', ownerId: 'owner-1' })],
    );

    await service.activate('owner-1', '22'.repeat(16), '999999', 'vehicle-1', 'old-tag');

    const newTag = tags.rows.find((t) => t.id === 'new-tag');
    expect(newTag?.previousTagId).toBe('old-tag');
    const activatedCall = auditRecord.mock.calls.find((call) => (call[0] as RecordAuditEventInput).action === 'tag.activated');
    expect(activatedCall?.[0]).toMatchObject({ metadata: { replacesTagId: 'old-tag' } });
  });

  it('rejects a replacement link to a tag that is not actually "replaced" yet', async () => {
    const pinHash = await bcrypt.hash('999999', 10);
    const { service } = makeService(
      [
        fakeTag({ id: 'old-tag', opaqueId: '33'.repeat(16), status: 'reported_lost', ownerId: 'owner-1' }),
        fakeTag({ id: 'new-tag', opaqueId: '44'.repeat(16), status: 'issued', activationPinHash: pinHash, vehicleId: null, ownerId: null }),
      ],
      [fakeVehicle({ id: 'vehicle-1', ownerId: 'owner-1' })],
    );

    await expect(service.activate('owner-1', '44'.repeat(16), '999999', 'vehicle-1', 'old-tag')).rejects.toThrow(
      'is not in a replaced state',
    );
  });

  it('rejects a replacement link to a tag owned by someone else (IDOR guard)', async () => {
    const pinHash = await bcrypt.hash('999999', 10);
    const { service } = makeService(
      [
        fakeTag({ id: 'old-tag', opaqueId: '55'.repeat(16), status: 'replaced', ownerId: 'someone-else' }),
        fakeTag({ id: 'new-tag', opaqueId: '66'.repeat(16), status: 'issued', activationPinHash: pinHash, vehicleId: null, ownerId: null }),
      ],
      [fakeVehicle({ id: 'vehicle-1', ownerId: 'owner-1' })],
    );

    await expect(service.activate('owner-1', '66'.repeat(16), '999999', 'vehicle-1', 'old-tag')).rejects.toThrow(
      'Not your tag to replace',
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

describe('TagsService.pause / resume', () => {
  it('pauses an active tag owned by the caller and records an audit event', async () => {
    const { service, tags, auditRecord } = makeService(
      [fakeTag({ id: 'tag-1', status: 'active', ownerId: 'owner-1' })],
      [],
    );

    const result = await service.pause('owner-1', 'tag-1');

    expect(result.status).toBe('paused');
    expect(tags.rows[0]?.status).toBe('paused');
    expect(auditActions(auditRecord)).toEqual(['tag.paused']);
  });

  it('rejects pausing a tag owned by someone else', async () => {
    const { service } = makeService([fakeTag({ id: 'tag-1', status: 'active', ownerId: 'owner-1' })], []);

    await expect(service.pause('owner-2', 'tag-1')).rejects.toThrow('Not your tag');
  });

  it('rejects pausing a tag that is not active/paused (e.g. reported lost)', async () => {
    const { service } = makeService([fakeTag({ id: 'tag-1', status: 'reported_lost', ownerId: 'owner-1' })], []);

    await expect(service.pause('owner-1', 'tag-1')).rejects.toThrow('Tag cannot transition from status "reported_lost"');
  });

  it('reactivates a paused tag owned by the caller and records an audit event', async () => {
    const { service, tags, auditRecord } = makeService(
      [fakeTag({ id: 'tag-1', status: 'paused', ownerId: 'owner-1' })],
      [],
    );

    const result = await service.resume('owner-1', 'tag-1');

    expect(result.status).toBe('active');
    expect(tags.rows[0]?.status).toBe('active');
    expect(auditActions(auditRecord)).toEqual(['tag.resumed']);
  });

  it('rejects reactivating a tag owned by someone else', async () => {
    const { service } = makeService([fakeTag({ id: 'tag-1', status: 'paused', ownerId: 'owner-1' })], []);

    await expect(service.resume('owner-2', 'tag-1')).rejects.toThrow('Not your tag');
  });
});

describe('TagsService.reportLost', () => {
  it('reports an active tag lost and records an audit event', async () => {
    const { service, tags, auditRecord } = makeService(
      [fakeTag({ id: 'tag-1', status: 'active', ownerId: 'owner-1' })],
      [],
    );

    const result = await service.reportLost('owner-1', 'tag-1');

    expect(result.status).toBe('reported_lost');
    expect(tags.rows[0]?.status).toBe('reported_lost');
    expect(auditActions(auditRecord)).toEqual(['tag.reported_lost']);
  });

  it('reports a paused tag lost', async () => {
    const { service, tags } = makeService([fakeTag({ id: 'tag-1', status: 'paused', ownerId: 'owner-1' })], []);

    await service.reportLost('owner-1', 'tag-1');

    expect(tags.rows[0]?.status).toBe('reported_lost');
  });

  it('rejects reporting a tag owned by someone else lost (IDOR guard)', async () => {
    const { service } = makeService([fakeTag({ id: 'tag-1', status: 'active', ownerId: 'owner-1' })], []);

    await expect(service.reportLost('owner-2', 'tag-1')).rejects.toThrow('Not your tag');
  });

  it('rejects reporting a tag lost from a status outside active/paused', async () => {
    const { service } = makeService([fakeTag({ id: 'tag-1', status: 'issued', ownerId: 'owner-1' })], []);

    await expect(service.reportLost('owner-1', 'tag-1')).rejects.toThrow('Tag cannot transition from status "issued"');
  });
});

describe('TagsService.requestReplacement', () => {
  it('marks a reported-lost tag replaced and records an audit event', async () => {
    const { service, tags, auditRecord } = makeService(
      [fakeTag({ id: 'tag-1', status: 'reported_lost', ownerId: 'owner-1' })],
      [],
    );

    const result = await service.requestReplacement('owner-1', 'tag-1');

    expect(result.status).toBe('replaced');
    expect(tags.rows[0]?.status).toBe('replaced');
    expect(auditActions(auditRecord)).toEqual(['tag.replacement_requested']);
  });

  it('clears the replaced tag\'s vehicleId, so it can never be confused with the vehicle\'s next (replacement) tag', async () => {
    // Regression test: VehiclesService looks a vehicle's current tag up by vehicleId alone. If a
    // replaced tag kept its old vehicleId, activating a replacement onto the same vehicle would
    // leave two tag rows pointing at it, and which one shows up as "the" tag would be undefined.
    const { service, tags } = makeService(
      [fakeTag({ id: 'tag-1', status: 'reported_lost', ownerId: 'owner-1', vehicleId: 'vehicle-1' })],
      [],
    );

    await service.requestReplacement('owner-1', 'tag-1');

    expect(tags.rows[0]?.vehicleId).toBeNull();
  });

  it('rejects replacing a tag owned by someone else', async () => {
    const { service } = makeService([fakeTag({ id: 'tag-1', status: 'reported_lost', ownerId: 'owner-1' })], []);

    await expect(service.requestReplacement('owner-2', 'tag-1')).rejects.toThrow('Not your tag');
  });

  it('rejects replacing a tag that has not been reported lost (e.g. still active)', async () => {
    const { service } = makeService([fakeTag({ id: 'tag-1', status: 'active', ownerId: 'owner-1' })], []);

    await expect(service.requestReplacement('owner-1', 'tag-1')).rejects.toThrow(
      'Tag cannot be replaced from status "active"',
    );
  });

  it('a replaced tag can never be re-activated (permanently unusable, even by its original owner)', async () => {
    const pinHash = await bcrypt.hash('999999', 10);
    const { service } = makeService(
      [fakeTag({ id: 'tag-1', opaqueId: '77'.repeat(16), status: 'replaced', activationPinHash: pinHash, ownerId: 'owner-1' })],
      [fakeVehicle({ id: 'vehicle-1', ownerId: 'owner-1' })],
    );

    await expect(service.activate('owner-1', '77'.repeat(16), '999999', 'vehicle-1')).rejects.toThrow(
      'Tag cannot be activated from status "replaced"',
    );
  });
});
