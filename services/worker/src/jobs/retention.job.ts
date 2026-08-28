/**
 * Purpose: Scheduled data-retention/anonymization sweep implementing
 * docs/PRIVACY_DATA_MAP.md "Deletion behavior" and docs/DATA_FLOW.md §6.
 * Responsibilities: Purges expired scan_sessions/otp_challenges, and hard-
 * deletes accounts whose deletion grace period has elapsed (relational
 * cascades in the initial migration remove their vehicles/tags/documents/
 * consents rows).
 * Security: Runs with the same database credentials as the rest of the
 * worker — no elevated access. Known gap: this job does not yet purge the
 * underlying S3 objects for a deleted account's documents (only their
 * database rows); a production deployment should extend this job (or add
 * a companion one) to also call StorageService.delete for each object key
 * before the row cascade removes the record of it — tracked in
 * docs/OPERATIONS_RUNBOOK.md as a pre-launch item.
 * Related: database/entities.ts, docs/PRIVACY_DATA_MAP.md.
 */
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan, Repository } from 'typeorm';
import { logger } from '@sampark/shared-security';
import { WORKER_CONFIG, type WorkerConfig } from '../config/config.module';
import { ScanSessionEntity, OtpChallengeEntity, UserEntity } from '../database/entities';

const OTP_CHALLENGE_RETENTION_DAYS = 1;

@Injectable()
export class RetentionJob {
  constructor(
    @InjectRepository(ScanSessionEntity) private readonly scanSessions: Repository<ScanSessionEntity>,
    @InjectRepository(OtpChallengeEntity) private readonly otpChallenges: Repository<OtpChallengeEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @Inject(WORKER_CONFIG) private readonly config: WorkerConfig,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run(): Promise<void> {
    await this.purgeScanSessions();
    await this.purgeOtpChallenges();
    await this.deleteExpiredAccounts();
  }

  private async purgeScanSessions(): Promise<void> {
    const cutoff = new Date(Date.now() - this.config.RETENTION_SCAN_SESSION_DAYS * 24 * 60 * 60 * 1000);
    const result = await this.scanSessions.delete({ createdAt: LessThan(cutoff) });
    logger.info('Retention: purged expired scan sessions', { count: result.affected ?? 0 });
  }

  private async purgeOtpChallenges(): Promise<void> {
    const cutoff = new Date(Date.now() - OTP_CHALLENGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await this.otpChallenges.delete({ createdAt: LessThan(cutoff) });
    logger.info('Retention: purged expired OTP challenges', { count: result.affected ?? 0 });
  }

  private async deleteExpiredAccounts(): Promise<void> {
    const cutoff = new Date(Date.now() - this.config.ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
    const expired = await this.users.find({ where: { status: 'deletion_requested', deletionRequestedAt: LessThan(cutoff) } });
    for (const user of expired) {
      await this.users.delete({ id: user.id });
      logger.info('Retention: hard-deleted account past grace period', { userId: user.id });
    }
  }
}
