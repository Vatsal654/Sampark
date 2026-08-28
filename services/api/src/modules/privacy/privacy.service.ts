/**
 * Purpose: Owner consent recording and the data-export / account-deletion
 * privacy workflow required by product spec §4D/§8.
 * Responsibilities: `recordConsent` appends a consent row (append-only —
 * consent history is never overwritten, only superseded by a newer row);
 * `exportData` assembles a JSON bundle of the owner's own
 * Sensitive/Internal data; `requestDeletion` starts the grace-period flow
 * documented in docs/PRIVACY_DATA_MAP.md "Deletion behavior".
 * Security: `exportData` decrypts fields only because the requester is
 * proven to be the data subject (JwtAuthGuard) — this is the one place
 * decryption-for-display of a user's own phone/vehicle data is expected.
 * Related: docs/PRIVACY_DATA_MAP.md, services/worker retention job.
 */
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { decryptField } from '@sampark/shared-security';
import type { ConsentType } from '@sampark/api-contracts';
import { ConsentEntity, UserEntity, VehicleEntity, VerifiedPhoneCredentialEntity } from '../../database/entities';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';
import { AuditService } from '../../common/audit/audit.service';

@Injectable()
export class PrivacyService {
  constructor(
    @InjectRepository(ConsentEntity) private readonly consents: Repository<ConsentEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(VehicleEntity) private readonly vehicles: Repository<VehicleEntity>,
    @InjectRepository(VerifiedPhoneCredentialEntity) private readonly phoneCredentials: Repository<VerifiedPhoneCredentialEntity>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly audit: AuditService,
  ) {}

  async recordConsent(userId: string, consentType: ConsentType, granted: boolean): Promise<void> {
    await this.consents.save(this.consents.create({ userId, consentType, granted }));
  }

  async exportData(userId: string) {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    const credential = await this.phoneCredentials.findOne({ where: { userId } });
    const vehicles = await this.vehicles.find({ where: { ownerId: userId } });
    const consents = await this.consents.find({ where: { userId }, order: { recordedAt: 'DESC' } });

    return {
      user: { id: user.id, fullName: user.fullName, preferredLocale: user.preferredLocale, createdAt: user.createdAt },
      phone: credential ? decryptField(credential.phoneEncrypted, this.config.FIELD_ENCRYPTION_ROOT_KEY) : null,
      vehicles: vehicles.map((v) => ({
        id: v.id,
        displayLabel: v.displayLabel,
        category: v.category,
        plateNumber: decryptField(v.plateNumberEncrypted, this.config.FIELD_ENCRYPTION_ROOT_KEY),
      })),
      consents: consents.map((c) => ({ type: c.consentType, granted: c.granted, recordedAt: c.recordedAt })),
      note: 'Document vault files are available as time-boxed download links via GET /owner/documents/:id/url, not embedded in this export.',
    };
  }

  async requestDeletion(userId: string): Promise<{ gracePeriodEndsAt: string }> {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    user.status = 'deletion_requested';
    user.deletionRequestedAt = new Date();
    await this.users.save(user);
    await this.audit.record({ actorType: 'owner', actorId: userId, action: 'account.deletion_requested', targetType: 'user', targetId: userId });

    const gracePeriodEndsAt = new Date(
      user.deletionRequestedAt.getTime() + this.config.ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000,
    );
    return { gracePeriodEndsAt: gracePeriodEndsAt.toISOString() };
  }
}
