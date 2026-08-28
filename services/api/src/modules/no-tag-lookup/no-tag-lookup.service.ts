/**
 * Purpose: Disabled-by-default no-tag vehicle lookup (product spec §7).
 * Responsibilities: Records every request attempt (even while disabled,
 * for audit visibility) and enforces the strict limits the spec requires
 * IF the feature is ever turned on — one request per vehicle per 7 days,
 * authenticated+verified requester, stated reason.
 * Security: `outcome` is `feature_disabled` for every call while
 * `FEATURE_NO_TAG_LOOKUP=false` (the default). No branch of this service
 * ever calls a government or third-party data API — none is integrated,
 * and none is simulated as if it were real. See docs/DECISIONS.md ADR-5.
 * Related: database/entities/no-tag-lookup.entity.ts, docs/THREAT_MODEL.md §3.13.
 */
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashForLookup } from '@sampark/shared-security';
import { NoTagLookupRequestEntity } from '../../database/entities';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';
import { AuditService } from '../../common/audit/audit.service';

const LOOKUP_INTERVAL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class NoTagLookupService {
  constructor(
    @InjectRepository(NoTagLookupRequestEntity) private readonly requests: Repository<NoTagLookupRequestEntity>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly rateLimit: RateLimitService,
    private readonly audit: AuditService,
  ) {}

  async requestLookup(userId: string, plateNumber: string, reason: string) {
    const plateLookupHash = hashForLookup(plateNumber, this.config.FIELD_ENCRYPTION_ROOT_KEY);

    if (!this.config.FEATURE_NO_TAG_LOOKUP) {
      await this.requests.save(
        this.requests.create({ requestedByUserId: userId, plateLookupHash, statedReason: reason, outcome: 'feature_disabled' }),
      );
      throw new ForbiddenException(
        'No-tag vehicle lookup is not available. It requires a written agreement with an authorized ' +
          'vehicle-data relay provider and legal approval — see docs/DECISIONS.md ADR-5.',
      );
    }

    // Unreachable while the capability flag is off; kept to document the intended limits once a
    // provider agreement exists (docs/README.md compliance checklist).
    const withinLimit = await this.rateLimit.consume(`no-tag-lookup:${plateLookupHash}`, 1, LOOKUP_INTERVAL_SECONDS);
    const outcome = withinLimit.allowed ? 'relay_attempted' : 'rate_limited';
    const record = await this.requests.save(
      this.requests.create({ requestedByUserId: userId, plateLookupHash, statedReason: reason, outcome }),
    );
    await this.audit.record({ actorType: 'owner', actorId: userId, action: 'no_tag_lookup.requested', targetType: 'no_tag_lookup_request', targetId: record.id, reason });

    if (!withinLimit.allowed) {
      throw new ForbiddenException('Only one lookup per vehicle is allowed every 7 days.');
    }
    throw new ForbiddenException('No authorized relay provider is configured on this deployment.');
  }
}
