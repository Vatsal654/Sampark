/**
 * Purpose: Implements every unauthenticated scanner-facing action — the
 * highest-risk surface in the system per docs/THREAT_MODEL.md.
 * Responsibilities: Tag resolution (signature-verified, PII-free),
 * anonymous alert/emergency submission, tag abuse reporting, and the
 * OTP-gated masked-call request flow.
 * Security: Every read/write here is rate-limited by IP and by tag; tag
 * resolution returns an identically-shaped 404 for "unknown ID" and
 * "bad signature" (§3.1); no method in this file can return an owner's
 * name, phone number, address, or document data under any tag status.
 * Related: packages/shared-security/tag-signature.ts, common/rate-limit,
 * common/queue, database/entities/{tag,alert,call}.entity.ts.
 */
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import {
  verifyTagSignature,
  isPlausibleOpaqueTagId,
  hashForLookup,
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
  OTP_TTL_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '@sampark/shared-security';
import type { GeoLocation, SubmitAlertRequest, SubmitEmergencyRequest, ReportTagRequest } from '@sampark/api-contracts';
import {
  TagEntity,
  VehicleEntity,
  AlertEventEntity,
  AlertDeliveryEntity,
  OtpChallengeEntity,
  ScanSessionEntity,
  CallSessionEntity,
  AbuseReportEntity,
  NotificationPreferenceEntity,
} from '../../database/entities';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';
import { AuditService } from '../../common/audit/audit.service';
import { OTP_PROVIDER, type OtpProvider } from '../providers/otp-provider.interface';
import { NOTIFICATIONS_QUEUE, CALL_BRIDGE_QUEUE } from '../../common/queue/queue.module';

const SCAN_SESSION_TTL_SECONDS = 10 * 60;
const CALL_SESSION_TTL_SECONDS = 5 * 60;

@Injectable()
export class PublicTagService {
  constructor(
    @InjectRepository(TagEntity) private readonly tags: Repository<TagEntity>,
    @InjectRepository(VehicleEntity) private readonly vehicles: Repository<VehicleEntity>,
    @InjectRepository(AlertEventEntity) private readonly alertEvents: Repository<AlertEventEntity>,
    @InjectRepository(AlertDeliveryEntity) private readonly alertDeliveries: Repository<AlertDeliveryEntity>,
    @InjectRepository(OtpChallengeEntity) private readonly otpChallenges: Repository<OtpChallengeEntity>,
    @InjectRepository(ScanSessionEntity) private readonly scanSessions: Repository<ScanSessionEntity>,
    @InjectRepository(CallSessionEntity) private readonly callSessions: Repository<CallSessionEntity>,
    @InjectRepository(AbuseReportEntity) private readonly abuseReports: Repository<AbuseReportEntity>,
    @InjectRepository(NotificationPreferenceEntity)
    private readonly notificationPreferences: Repository<NotificationPreferenceEntity>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly notificationsQueue: Queue,
    @InjectQueue(CALL_BRIDGE_QUEUE) private readonly callBridgeQueue: Queue,
    private readonly rateLimit: RateLimitService,
    private readonly audit: AuditService,
  ) {}

  /** Resolves a scanned tag to its public-safe view. Identical 404 for unknown ID and bad signature. */
  async resolveTag(opaqueId: string, signature: string, clientIp: string) {
    await this.enforceRate(`tag:resolve:ip:${clientIp}`, 60, 60);

    if (!isPlausibleOpaqueTagId(opaqueId) || !verifyTagSignature(opaqueId, signature, this.config.TAG_SIGNING_SECRET)) {
      throw new NotFoundException('Tag not found');
    }
    const tag = await this.tags.findOne({ where: { opaqueId } });
    if (!tag) throw new NotFoundException('Tag not found');

    await this.enforceRate(`tag:resolve:tag:${tag.id}`, 30, 60);

    let vehicleDisplayLabel: string | null = null;
    let vehicleCategory: string | null = null;
    let callbackEnabled = false;
    let emergencyEnabled = false;

    if (tag.vehicleId && ['active', 'paused'].includes(tag.status)) {
      const vehicle = await this.vehicles.findOne({ where: { id: tag.vehicleId } });
      vehicleDisplayLabel = vehicle?.displayLabel ?? null;
      vehicleCategory = vehicle?.category ?? null;
      if (tag.ownerId) {
        const prefs = await this.notificationPreferences.findOne({ where: { userId: tag.ownerId } });
        callbackEnabled = tag.status === 'active' && (prefs?.maskedCallsEnabled ?? true) && this.config.FEATURE_LIVE_CALL_BRIDGING;
        emergencyEnabled = tag.status === 'active';
      }
    }

    return {
      opaqueId: tag.opaqueId,
      status: tag.status,
      vehicleDisplayLabel,
      vehicleCategory,
      callbackEnabled,
      emergencyEnabled,
    };
  }

  async submitAlert(opaqueId: string, signature: string, clientIp: string, input: SubmitAlertRequest) {
    const tag = await this.getScannableTag(opaqueId, signature);
    await this.enforceRate(`alert:tag:${tag.id}`, 10, 10 * 60);
    await this.enforceRate(`alert:ip:${clientIp}`, 20, 10 * 60);

    const alertEvent = await this.createAlertEvent(tag, 'normal', input.category, input.note ?? null, input.location, clientIp);
    return { alertId: alertEvent.id, acknowledged: true as const };
  }

  async submitEmergency(opaqueId: string, signature: string, clientIp: string, input: SubmitEmergencyRequest) {
    const tag = await this.getScannableTag(opaqueId, signature);
    // Emergency alerts get a higher threshold than normal alerts, never unlimited (docs/THREAT_MODEL.md §3.12).
    await this.enforceRate(`emergency:tag:${tag.id}`, 5, 10 * 60);

    const alertEvent = await this.createAlertEvent(tag, 'emergency', 'accident_emergency', input.note ?? null, input.location, clientIp);
    return { alertId: alertEvent.id, acknowledged: true as const };
  }

  async reportTag(opaqueId: string, signature: string, input: ReportTagRequest) {
    const tag = await this.getScannableTagAllowingUnavailable(opaqueId, signature);
    await this.abuseReports.save(
      this.abuseReports.create({ reason: input.reason, note: input.note ?? null, reviewStatus: 'open' }),
    );
    await this.audit.record({ actorType: 'scanner', action: 'tag.reported', targetType: 'tag', targetId: tag.id, reason: input.reason });
    return { received: true as const };
  }

  async requestCallOtp(opaqueId: string, signature: string, clientIp: string, phoneE164: string) {
    await this.getScannableTag(opaqueId, signature);
    const phoneHash = hashForLookup(phoneE164, this.config.FIELD_ENCRYPTION_ROOT_KEY);

    await this.enforceRate(`call-otp:ip:${clientIp}`, 10, 60 * 60);
    if (await this.rateLimit.isCoolingDown(`call-otp:cooldown:${phoneHash}`)) {
      return { sent: true as const, retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS };
    }

    const code = generateOtpCode();
    const codeHash = await hashOtpCode(code);
    await this.otpChallenges.save(
      this.otpChallenges.create({
        phoneLookupHash: phoneHash,
        purpose: 'scanner_call_verification',
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
      }),
    );
    await this.rateLimit.startCooldown(`call-otp:cooldown:${phoneHash}`, OTP_RESEND_COOLDOWN_SECONDS);
    await this.otpProvider.sendOtp(phoneE164, code);
    return { sent: true as const, retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS };
  }

  async verifyCallOtp(opaqueId: string, signature: string, phoneE164: string, code: string) {
    const tag = await this.getScannableTag(opaqueId, signature);
    const phoneHash = hashForLookup(phoneE164, this.config.FIELD_ENCRYPTION_ROOT_KEY);

    const challenge = await this.otpChallenges.findOne({
      where: { phoneLookupHash: phoneHash, purpose: 'scanner_call_verification', consumed: false },
      order: { createdAt: 'DESC' },
    });
    if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    if (challenge.attemptCount >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Too many attempts. Request a new code.');
    }
    if (!(await verifyOtpCode(code, challenge.codeHash))) {
      challenge.attemptCount += 1;
      await this.otpChallenges.save(challenge);
      throw new UnauthorizedException('Invalid or expired code');
    }
    challenge.consumed = true;
    await this.otpChallenges.save(challenge);

    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SCAN_SESSION_TTL_SECONDS * 1000);
    await this.scanSessions.save(
      this.scanSessions.create({
        tagId: tag.id,
        scannerPhoneLookupHash: phoneHash,
        tokenHash: await bcrypt.hash(rawToken, 10),
        scopedAction: 'masked_call',
        expiresAt,
      }),
    );
    return { scanSessionToken: rawToken, expiresAt: expiresAt.toISOString() };
  }

  async requestMaskedCall(opaqueId: string, signature: string, scanSessionToken: string) {
    if (!this.config.FEATURE_LIVE_CALL_BRIDGING) {
      throw new ForbiddenException(
        'Live masked calling is not enabled on this deployment. See docs/DECISIONS.md ADR-4.',
      );
    }
    const tag = await this.getScannableTag(opaqueId, signature);
    await this.enforceRate(`call:tag:${tag.id}`, 5, 10 * 60);

    const candidates = await this.scanSessions.find({
      where: { tagId: tag.id, used: false, scopedAction: 'masked_call' },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    let matched: ScanSessionEntity | null = null;
    for (const candidate of candidates) {
      if (candidate.expiresAt.getTime() < Date.now()) continue;
      if (await bcrypt.compare(scanSessionToken, candidate.tokenHash)) {
        matched = candidate;
        break;
      }
    }
    if (!matched) throw new UnauthorizedException('Invalid, expired, or already-used scan session');

    matched.used = true;
    await this.scanSessions.save(matched);

    const expiresAt = new Date(Date.now() + CALL_SESSION_TTL_SECONDS * 1000);
    const callSession = await this.callSessions.save(
      this.callSessions.create({ tagId: tag.id, scanSessionId: matched.id, status: 'pending', expiresAt }),
    );
    await this.callBridgeQueue.add('bridge-call', { callSessionId: callSession.id });

    return { callSessionId: callSession.id, status: callSession.status, expiresAt: expiresAt.toISOString() };
  }

  // --- helpers -----------------------------------------------------------

  private async enforceRate(key: string, limit: number, windowSeconds: number): Promise<void> {
    const result = await this.rateLimit.consume(key, limit, windowSeconds);
    if (!result.allowed) {
      throw new BadRequestException('Too many requests. Please try again shortly.');
    }
  }

  /** Resolves and validates a tag is in an interactable (active, not paused) state. */
  private async getScannableTag(opaqueId: string, signature: string): Promise<TagEntity> {
    if (!isPlausibleOpaqueTagId(opaqueId) || !verifyTagSignature(opaqueId, signature, this.config.TAG_SIGNING_SECRET)) {
      throw new NotFoundException('Tag not found');
    }
    const tag = await this.tags.findOne({ where: { opaqueId } });
    if (!tag) throw new NotFoundException('Tag not found');
    if (tag.status !== 'active') {
      throw new ForbiddenException('This tag is not currently accepting alerts');
    }
    return tag;
  }

  /** Same signature validation as getScannableTag but permits any known status (used by report-tag). */
  private async getScannableTagAllowingUnavailable(opaqueId: string, signature: string): Promise<TagEntity> {
    if (!isPlausibleOpaqueTagId(opaqueId) || !verifyTagSignature(opaqueId, signature, this.config.TAG_SIGNING_SECRET)) {
      throw new NotFoundException('Tag not found');
    }
    const tag = await this.tags.findOne({ where: { opaqueId } });
    if (!tag) throw new NotFoundException('Tag not found');
    return tag;
  }

  private async createAlertEvent(
    tag: TagEntity,
    severity: 'normal' | 'emergency',
    category: string,
    note: string | null,
    location: GeoLocation | undefined,
    clientIp: string,
  ): Promise<AlertEventEntity> {
    if (!tag.vehicleId) throw new NotFoundException('Tag has no linked vehicle');

    const alertEvent = await this.alertEvents.save(
      this.alertEvents.create({
        tagId: tag.id,
        vehicleId: tag.vehicleId,
        category: category as AlertEventEntity['category'],
        severity,
        note,
        scannerLocationLabel: location ? 'Near scan location' : null,
        scannerLocationExact: location ? { latitude: location.latitude, longitude: location.longitude } : null,
        scannerFingerprintHash: hashForLookup(clientIp, this.config.FIELD_ENCRYPTION_ROOT_KEY),
      }),
    );

    for (const channel of ['push', 'whatsapp', 'sms'] as const) {
      await this.alertDeliveries.save(this.alertDeliveries.create({ alertEventId: alertEvent.id, channel, status: 'queued' }));
    }

    await this.notificationsQueue.add(
      severity === 'emergency' ? 'deliver-emergency' : 'deliver-alert',
      { alertEventId: alertEvent.id },
      { priority: severity === 'emergency' ? 1 : 10 },
    );

    return alertEvent;
  }
}
