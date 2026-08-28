/**
 * Purpose: Owner emergency profile/contacts management, and the
 * scanner-facing emergency card resolution used after a scanner confirms
 * "this is a genuine emergency" (product spec §4F/§5E).
 * Responsibilities: Owner CRUD scoped to the authenticated user; a
 * read-only scanner view that ANDs each field with its own `share*` flag
 * so nothing is exposed the owner didn't explicitly opt into.
 * Security: `getScannerCard` never returns the full profile row — it
 * builds a new object field-by-field, so a future field added to the
 * entity is private by default until explicitly wired here.
 * Related: database/entities/emergency.entity.ts,
 * packages/api-contracts/src/emergency.ts.
 */
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { decryptField, encryptField, hashForLookup, isPlausibleOpaqueTagId, verifyTagSignature } from '@sampark/shared-security';
import type { EmergencyContact, EmergencyProfile } from '@sampark/api-contracts';
import { EmergencyProfileEntity, EmergencyContactEntity, TagEntity } from '../../database/entities';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';

@Injectable()
export class EmergencyService {
  constructor(
    @InjectRepository(EmergencyProfileEntity) private readonly profiles: Repository<EmergencyProfileEntity>,
    @InjectRepository(EmergencyContactEntity) private readonly contacts: Repository<EmergencyContactEntity>,
    @InjectRepository(TagEntity) private readonly tags: Repository<TagEntity>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async getProfile(userId: string): Promise<EmergencyProfile> {
    const row = await this.getOrCreateProfile(userId);
    return {
      bloodGroup: row.bloodGroup as EmergencyProfile['bloodGroup'],
      allergiesNote: row.allergiesNoteEncrypted ? decryptField(row.allergiesNoteEncrypted, this.config.FIELD_ENCRYPTION_ROOT_KEY) : null,
      safeInstructions: row.safeInstructionsEncrypted
        ? decryptField(row.safeInstructionsEncrypted, this.config.FIELD_ENCRYPTION_ROOT_KEY)
        : null,
      shareBloodGroup: row.shareBloodGroup,
      shareAllergies: row.shareAllergies,
      shareSafeInstructions: row.shareSafeInstructions,
      shareContactsWithResponders: row.shareContactsWithResponders,
    };
  }

  async updateProfile(userId: string, input: EmergencyProfile): Promise<EmergencyProfile> {
    const row = await this.getOrCreateProfile(userId);
    row.bloodGroup = input.bloodGroup;
    row.allergiesNoteEncrypted = input.allergiesNote
      ? encryptField(input.allergiesNote, this.config.FIELD_ENCRYPTION_ROOT_KEY)
      : null;
    row.safeInstructionsEncrypted = input.safeInstructions
      ? encryptField(input.safeInstructions, this.config.FIELD_ENCRYPTION_ROOT_KEY)
      : null;
    row.shareBloodGroup = input.shareBloodGroup;
    row.shareAllergies = input.shareAllergies;
    row.shareSafeInstructions = input.shareSafeInstructions;
    row.shareContactsWithResponders = input.shareContactsWithResponders;
    await this.profiles.save(row);
    return this.getProfile(userId);
  }

  async listContacts(userId: string) {
    const rows = await this.contacts.find({ where: { userId }, order: { createdAt: 'ASC' } });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      phoneE164: decryptField(row.phoneEncrypted, this.config.FIELD_ENCRYPTION_ROOT_KEY),
      relationship: row.relationship,
    }));
  }

  async addContact(userId: string, input: EmergencyContact) {
    const row = await this.contacts.save(
      this.contacts.create({
        userId,
        name: input.name,
        phoneEncrypted: encryptField(input.phoneE164, this.config.FIELD_ENCRYPTION_ROOT_KEY),
        phoneLookupHash: hashForLookup(input.phoneE164, this.config.FIELD_ENCRYPTION_ROOT_KEY),
        relationship: input.relationship ?? null,
      }),
    );
    return { id: row.id };
  }

  async removeContact(userId: string, contactId: string): Promise<void> {
    const row = await this.contacts.findOne({ where: { id: contactId } });
    if (!row) throw new NotFoundException('Contact not found');
    if (row.userId !== userId) throw new ForbiddenException('Not your contact');
    await this.contacts.remove(row);
  }

  /** Scanner-facing view — only reachable for an active tag, after the scanner confirms a genuine emergency. */
  async getScannerCard(opaqueId: string, signature: string) {
    if (!isPlausibleOpaqueTagId(opaqueId) || !verifyTagSignature(opaqueId, signature, this.config.TAG_SIGNING_SECRET)) {
      throw new NotFoundException('Tag not found');
    }
    const tag = await this.tags.findOne({ where: { opaqueId } });
    if (!tag || tag.status !== 'active' || !tag.ownerId) {
      throw new NotFoundException('Tag not found');
    }
    const profile = await this.profiles.findOne({ where: { userId: tag.ownerId } });
    return {
      bloodGroup: profile?.shareBloodGroup ? profile.bloodGroup : null,
      allergiesNote:
        profile?.shareAllergies && profile.allergiesNoteEncrypted
          ? decryptField(profile.allergiesNoteEncrypted, this.config.FIELD_ENCRYPTION_ROOT_KEY)
          : null,
      safeInstructions:
        profile?.shareSafeInstructions && profile.safeInstructionsEncrypted
          ? decryptField(profile.safeInstructionsEncrypted, this.config.FIELD_ENCRYPTION_ROOT_KEY)
          : null,
      seekEmergencyServicesFirst: true as const,
    };
  }

  private async getOrCreateProfile(userId: string): Promise<EmergencyProfileEntity> {
    const existing = await this.profiles.findOne({ where: { userId } });
    if (existing) return existing;
    return this.profiles.save(this.profiles.create({ userId }));
  }
}
