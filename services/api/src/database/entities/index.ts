export * from './user.entity';
export * from './vehicle.entity';
export * from './tag.entity';
export * from './alert.entity';
export * from './call.entity';
export * from './emergency.entity';
export * from './document.entity';
export * from './abuse.entity';
export * from './notification-preference.entity';
export * from './no-tag-lookup.entity';
export * from './webhook.entity';
export * from './admin.entity';
export * from './order.entity';

import { UserEntity, VerifiedPhoneCredentialEntity, UserSessionEntity, ConsentEntity } from './user.entity';
import { VehicleEntity } from './vehicle.entity';
import { TagEntity, TagShipmentEntity, TagActivationChallengeEntity } from './tag.entity';
import { AlertEventEntity, AlertDeliveryEntity } from './alert.entity';
import { OtpChallengeEntity, ScanSessionEntity, CallSessionEntity } from './call.entity';
import { EmergencyProfileEntity, EmergencyContactEntity } from './emergency.entity';
import { DocumentEntity, DocumentAccessGrantEntity } from './document.entity';
import { AbuseReportEntity, BlockedIdentityEntity } from './abuse.entity';
import { NotificationPreferenceEntity } from './notification-preference.entity';
import { NoTagLookupRequestEntity } from './no-tag-lookup.entity';
import { ProviderWebhookEventEntity } from './webhook.entity';
import { AdminRoleEntity, AdminUserEntity, FeatureFlagEntity, AuditEventEntity, SupportTicketEntity } from './admin.entity';
import { OrderEntity } from './order.entity';

/** Full entity list for TypeOrmModule.forRoot / forFeature registration. */
export const ALL_ENTITIES = [
  UserEntity,
  VerifiedPhoneCredentialEntity,
  UserSessionEntity,
  ConsentEntity,
  VehicleEntity,
  TagEntity,
  TagShipmentEntity,
  TagActivationChallengeEntity,
  AlertEventEntity,
  AlertDeliveryEntity,
  OtpChallengeEntity,
  ScanSessionEntity,
  CallSessionEntity,
  EmergencyProfileEntity,
  EmergencyContactEntity,
  DocumentEntity,
  DocumentAccessGrantEntity,
  AbuseReportEntity,
  BlockedIdentityEntity,
  NotificationPreferenceEntity,
  NoTagLookupRequestEntity,
  ProviderWebhookEventEntity,
  AdminRoleEntity,
  AdminUserEntity,
  FeatureFlagEntity,
  AuditEventEntity,
  SupportTicketEntity,
  OrderEntity,
];
