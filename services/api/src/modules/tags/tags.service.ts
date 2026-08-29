/**
 * Purpose: Owner-facing tag lifecycle — activation, pause/resume, lost
 * reporting, replacement, and reassignment.
 * Responsibilities: Implements the "possession of a QR URL is not proof
 * of ownership" invariant from docs/THREAT_MODEL.md §3.2: activation
 * requires an authenticated owner session AND a physical activation PIN
 * shipped separately from the sticker, and reassignment requires a
 * recently-issued ("step-up") access token, not just an old session.
 * Security: Every state transition writes a TagActivationChallengeEntity
 * (for activation) and/or an AuditEvent (for every other transition) so
 * tag-takeover attempts are forensically reconstructable.
 * Related: database/entities/tag.entity.ts, modules/public-tag,
 * packages/shared-security/tag-signature.ts.
 */
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { TagActivationChallengeEntity, TagEntity, VehicleEntity } from '../../database/entities';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';
import { AuditService } from '../../common/audit/audit.service';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';

const REAUTH_MAX_AGE_SECONDS = 5 * 60;
// Bounds PIN-guessing against a *known* opaqueId (e.g. photographed off a sticker) — an
// authenticated owner session is not proof the caller owns the physical tag, only the PIN is
// (docs/THREAT_MODEL.md §3.2), so this endpoint needs its own brute-force ceiling independent of
// anything the JWT already grants. Keyed by opaqueId, not by the caller, so it holds regardless
// of which account is attempting.
const ACTIVATION_ATTEMPT_LIMIT = 5;
const ACTIVATION_ATTEMPT_WINDOW_SECONDS = 15 * 60;

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(TagEntity) private readonly tags: Repository<TagEntity>,
    @InjectRepository(VehicleEntity) private readonly vehicles: Repository<VehicleEntity>,
    @InjectRepository(TagActivationChallengeEntity)
    private readonly activationChallenges: Repository<TagActivationChallengeEntity>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async activate(
    ownerId: string,
    opaqueId: string,
    activationPin: string,
    vehicleId: string,
    replacesTagId?: string,
  ) {
    const rate = await this.rateLimit.consume(`tag-activate:${opaqueId}`, ACTIVATION_ATTEMPT_LIMIT, ACTIVATION_ATTEMPT_WINDOW_SECONDS);
    if (!rate.allowed) {
      throw new BadRequestException('Too many activation attempts for this tag. Please try again later.');
    }

    const tag = await this.tags.findOne({ where: { opaqueId } });
    if (!tag) throw new NotFoundException('Tag not found');

    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle || vehicle.ownerId !== ownerId) throw new ForbiddenException('Not your vehicle');

    if (!['issued', 'pending_activation'].includes(tag.status)) {
      await this.recordChallenge(tag.id, ownerId, false, 'already_active');
      throw new ForbiddenException(`Tag cannot be activated from status "${tag.status}"`);
    }
    if (!tag.activationPinHash || !(await bcrypt.compare(activationPin, tag.activationPinHash))) {
      await this.recordChallenge(tag.id, ownerId, false, 'invalid_pin');
      throw new UnauthorizedException('Invalid activation code');
    }

    // Optional replacement lineage: only links two tags the SAME authenticated owner controls,
    // and only from a tag that is actually 'replaced' (i.e. already went through
    // reportLost -> requestReplacement) — this is metadata for support/audit, never a bypass of
    // the PIN check above, which already ran unconditionally.
    if (replacesTagId !== undefined) {
      const previousTag = await this.tags.findOne({ where: { id: replacesTagId } });
      if (!previousTag || previousTag.ownerId !== ownerId) {
        throw new ForbiddenException('Not your tag to replace');
      }
      if (previousTag.status !== 'replaced') {
        throw new ForbiddenException(`Tag "${replacesTagId}" is not in a replaced state`);
      }
      tag.previousTagId = replacesTagId;
    }

    tag.status = 'active';
    tag.vehicleId = vehicleId;
    tag.ownerId = ownerId;
    tag.activatedAt = new Date();
    await this.tags.save(tag);
    await this.recordChallenge(tag.id, ownerId, true, 'activated');
    await this.audit.record({
      actorType: 'owner',
      actorId: ownerId,
      action: 'tag.activated',
      targetType: 'tag',
      targetId: tag.id,
      metadata: replacesTagId ? { replacesTagId } : undefined,
    });

    return { id: tag.id, status: tag.status, vehicleId: tag.vehicleId };
  }

  async pause(ownerId: string, tagId: string) {
    const tag = await this.getOwnedActiveOrPaused(ownerId, tagId);
    tag.status = 'paused';
    await this.tags.save(tag);
    await this.audit.record({ actorType: 'owner', actorId: ownerId, action: 'tag.paused', targetType: 'tag', targetId: tag.id });
    return { id: tag.id, status: tag.status };
  }

  async resume(ownerId: string, tagId: string) {
    const tag = await this.getOwnedActiveOrPaused(ownerId, tagId);
    tag.status = 'active';
    await this.tags.save(tag);
    await this.audit.record({ actorType: 'owner', actorId: ownerId, action: 'tag.resumed', targetType: 'tag', targetId: tag.id });
    return { id: tag.id, status: tag.status };
  }

  async reportLost(ownerId: string, tagId: string) {
    // Active/paused only — this is exactly getOwnedActiveOrPaused's guard, and reusing it means
    // "which statuses can reach reported_lost" cannot drift from "which statuses pause/resume
    // already agree are the tag's normal-operation pool".
    const tag = await this.getOwnedActiveOrPaused(ownerId, tagId);
    tag.status = 'reported_lost';
    await this.tags.save(tag);
    await this.audit.record({ actorType: 'owner', actorId: ownerId, action: 'tag.reported_lost', targetType: 'tag', targetId: tag.id });
    return { id: tag.id, status: tag.status };
  }

  async requestReplacement(ownerId: string, tagId: string) {
    const tag = await this.getOwned(ownerId, tagId);
    if (tag.status !== 'reported_lost') {
      throw new ForbiddenException(`Tag cannot be replaced from status "${tag.status}" — report it lost first`);
    }
    tag.status = 'replaced';
    // A vehicle can only ever have one *current* tag — VehiclesService looks a vehicle's tag up
    // by vehicleId alone, so a replaced tag keeping its old vehicleId would leave two rows
    // pointing at the same vehicle the moment a replacement is activated, and which one
    // VehiclesService finds first would be undefined. Clearing it here means "replaced" always
    // means "no longer this vehicle's tag" — the vehicle correctly shows no tag at all until a
    // replacement is activated onto it. ownerId is deliberately kept: activate()'s
    // replacesTagId path needs it to verify the caller actually owns the tag being replaced.
    tag.vehicleId = null;
    await this.tags.save(tag);
    await this.audit.record({ actorType: 'owner', actorId: ownerId, action: 'tag.replacement_requested', targetType: 'tag', targetId: tag.id });
    return { id: tag.id, status: tag.status };
  }

  async reassign(ownerId: string, tagId: string, newVehicleId: string, reauthToken: string) {
    this.assertRecentReauth(ownerId, reauthToken);

    const tag = await this.getOwned(ownerId, tagId);
    const vehicle = await this.vehicles.findOne({ where: { id: newVehicleId } });
    if (!vehicle || vehicle.ownerId !== ownerId) throw new ForbiddenException('Not your vehicle');

    tag.vehicleId = newVehicleId;
    await this.tags.save(tag);
    await this.audit.record({
      actorType: 'owner',
      actorId: ownerId,
      action: 'tag.reassigned',
      targetType: 'tag',
      targetId: tag.id,
      metadata: { newVehicleId },
    });
    return { id: tag.id, vehicleId: tag.vehicleId };
  }

  private assertRecentReauth(ownerId: string, reauthToken: string): void {
    try {
      const payload = this.jwtService.verify<{ sub: string; type: string; iat: number }>(reauthToken, {
        secret: this.config.JWT_ACCESS_SECRET,
      });
      if (payload.type !== 'access' || payload.sub !== ownerId) {
        throw new Error('mismatch');
      }
      const ageSeconds = Date.now() / 1000 - payload.iat;
      if (ageSeconds > REAUTH_MAX_AGE_SECONDS) {
        throw new Error('stale');
      }
    } catch {
      throw new UnauthorizedException('Reassignment requires a recently issued session (step-up re-authentication)');
    }
  }

  private async getOwned(ownerId: string, tagId: string): Promise<TagEntity> {
    const tag = await this.tags.findOne({ where: { id: tagId } });
    if (!tag) throw new NotFoundException('Tag not found');
    if (tag.ownerId !== ownerId) throw new ForbiddenException('Not your tag');
    return tag;
  }

  private async getOwnedActiveOrPaused(ownerId: string, tagId: string): Promise<TagEntity> {
    const tag = await this.getOwned(ownerId, tagId);
    if (!['active', 'paused'].includes(tag.status)) {
      throw new ForbiddenException(`Tag cannot transition from status "${tag.status}"`);
    }
    return tag;
  }

  private async recordChallenge(
    tagId: string,
    requestedByUserId: string,
    successful: boolean,
    outcome: TagActivationChallengeEntity['outcome'],
  ): Promise<void> {
    await this.activationChallenges.save(
      this.activationChallenges.create({ tagId, requestedByUserId, successful, outcome }),
    );
  }
}
