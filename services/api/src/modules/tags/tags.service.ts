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
import { ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { TagActivationChallengeEntity, TagEntity, VehicleEntity } from '../../database/entities';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';
import { AuditService } from '../../common/audit/audit.service';

const REAUTH_MAX_AGE_SECONDS = 5 * 60;

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
  ) {}

  async activate(ownerId: string, opaqueId: string, activationPin: string, vehicleId: string) {
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

    tag.status = 'active';
    tag.vehicleId = vehicleId;
    tag.ownerId = ownerId;
    tag.activatedAt = new Date();
    await this.tags.save(tag);
    await this.recordChallenge(tag.id, ownerId, true, 'activated');
    await this.audit.record({ actorType: 'owner', actorId: ownerId, action: 'tag.activated', targetType: 'tag', targetId: tag.id });

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
    const tag = await this.getOwned(ownerId, tagId);
    tag.status = 'reported_lost';
    await this.tags.save(tag);
    await this.audit.record({ actorType: 'owner', actorId: ownerId, action: 'tag.reported_lost', targetType: 'tag', targetId: tag.id });
    return { id: tag.id, status: tag.status };
  }

  async requestReplacement(ownerId: string, tagId: string) {
    const tag = await this.getOwned(ownerId, tagId);
    tag.status = 'replaced';
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
