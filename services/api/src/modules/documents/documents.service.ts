/**
 * Purpose: Secure document vault — upload, list, delete, short-lived
 * signed download URLs, and revocable inspector share codes.
 * Responsibilities: Enforces FEATURE_DOCUMENT_VAULT, virus-scans on
 * upload, and never returns a permanent URL or the raw storage key to a
 * client.
 * Security: `getSignedUrl` re-checks ownership on every call — a signed
 * URL is minted fresh per authorized request, never cached or reused
 * across owners. Inspector shares use a separate random code (bcrypt
 * hashed at rest) with their own expiry, distinct from the owner's own
 * session.
 * Related: storage.service.ts, virus-scan.interface.ts,
 * database/entities/document.entity.ts.
 */
import { ForbiddenException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { DocumentUploadMetadata } from '@sampark/api-contracts';
import { DocumentEntity, DocumentAccessGrantEntity } from '../../database/entities';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';
import { AuditService } from '../../common/audit/audit.service';
import { StorageService } from './storage.service';
import { VIRUS_SCAN_PROVIDER, type VirusScanProvider } from './virus-scan.interface';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity) private readonly documents: Repository<DocumentEntity>,
    @InjectRepository(DocumentAccessGrantEntity) private readonly grants: Repository<DocumentAccessGrantEntity>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(VIRUS_SCAN_PROVIDER) private readonly virusScan: VirusScanProvider,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async upload(ownerId: string, metadata: DocumentUploadMetadata, file: { buffer: Buffer; mimetype: string }) {
    this.assertVaultEnabled();

    const scanResult = await this.virusScan.scan(file.buffer);
    if (!scanResult.clean) {
      throw new UnprocessableEntityException('This file failed a safety scan and was not stored.');
    }

    const objectKey = randomUUID();
    await this.storage.upload(objectKey, file.buffer, file.mimetype);

    const document = await this.documents.save(
      this.documents.create({
        ownerId,
        vehicleId: metadata.vehicleId ?? null,
        documentType: metadata.documentType,
        storageObjectKey: objectKey,
        status: 'available',
        expiresOn: metadata.expiresOn ?? null,
      }),
    );
    await this.audit.record({ actorType: 'owner', actorId: ownerId, action: 'document.uploaded', targetType: 'document', targetId: document.id });

    return { id: document.id, documentType: document.documentType, status: document.status, expiresOn: document.expiresOn, uploadedAt: document.uploadedAt.toISOString() };
  }

  async list(ownerId: string) {
    const rows = await this.documents.find({ where: { ownerId }, order: { uploadedAt: 'DESC' } });
    return rows
      .filter((row) => !row.deletedAt)
      .map((row) => ({
        id: row.id,
        documentType: row.documentType,
        status: row.status,
        expiresOn: row.expiresOn,
        uploadedAt: row.uploadedAt.toISOString(),
      }));
  }

  async remove(ownerId: string, documentId: string): Promise<void> {
    const document = await this.getOwned(ownerId, documentId);
    document.deletedAt = new Date();
    await this.documents.save(document);
    await this.storage.delete(document.storageObjectKey);
    await this.audit.record({ actorType: 'owner', actorId: ownerId, action: 'document.deleted', targetType: 'document', targetId: document.id });
  }

  async getSignedUrl(ownerId: string, documentId: string) {
    const document = await this.getOwned(ownerId, documentId);
    if (document.status !== 'available') throw new NotFoundException('Document not available');
    return this.storage.getSignedDownloadUrl(document.storageObjectKey);
  }

  async createShare(ownerId: string, documentId: string, ttlMinutes: number) {
    const document = await this.getOwned(ownerId, documentId);
    const code = randomBytes(9).toString('base64url');
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await this.grants.save(
      this.grants.create({ documentId: document.id, shareCodeHash: await bcrypt.hash(code, 10), expiresAt }),
    );
    await this.audit.record({ actorType: 'owner', actorId: ownerId, action: 'document.share_created', targetType: 'document', targetId: document.id });
    return { shareCode: code, expiresAt: expiresAt.toISOString(), revoked: false };
  }

  async revokeAllShares(ownerId: string, documentId: string): Promise<void> {
    await this.getOwned(ownerId, documentId);
    await this.grants.update({ documentId }, { revoked: true });
  }

  private async getOwned(ownerId: string, documentId: string): Promise<DocumentEntity> {
    const document = await this.documents.findOne({ where: { id: documentId } });
    if (!document || document.deletedAt) throw new NotFoundException('Document not found');
    if (document.ownerId !== ownerId) throw new ForbiddenException('Not your document');
    return document;
  }

  private assertVaultEnabled(): void {
    if (!this.config.FEATURE_DOCUMENT_VAULT) {
      throw new ForbiddenException('Document vault is disabled on this deployment.');
    }
  }
}
