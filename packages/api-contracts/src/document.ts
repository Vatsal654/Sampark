/**
 * Purpose: Secure document vault contracts.
 * Responsibilities: Upload metadata, owner-facing document list view, and
 * the short-lived signed-URL response shape.
 * Security: No schema in this file ever contains a permanent URL — see
 * `documentSignedUrlResponseSchema.expiresAt`, which callers must treat as
 * authoritative and re-request after expiry rather than caching the URL.
 * Related: services/api documents module, apps/mobile.
 */
import { z } from 'zod';
import { DOCUMENT_TYPES } from './enums';

export const documentUploadMetadataSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  vehicleId: z.string().uuid().optional(),
  expiresOn: z.string().date().optional(),
});
export type DocumentUploadMetadata = z.infer<typeof documentUploadMetadataSchema>;

export const documentViewSchema = z.object({
  id: z.string().uuid(),
  documentType: z.enum(DOCUMENT_TYPES),
  status: z.enum(['pending_scan', 'available', 'rejected']),
  expiresOn: z.string().date().nullable(),
  uploadedAt: z.string().datetime(),
});
export type DocumentView = z.infer<typeof documentViewSchema>;

export const documentSignedUrlResponseSchema = z.object({
  url: z.string().url(),
  expiresAt: z.string().datetime(),
});
export type DocumentSignedUrlResponse = z.infer<typeof documentSignedUrlResponseSchema>;

export const createDocumentShareSchema = z.object({
  documentId: z.string().uuid(),
  ttlMinutes: z.number().int().min(1).max(60).default(15),
});
export type CreateDocumentShare = z.infer<typeof createDocumentShareSchema>;

export const documentShareViewSchema = z.object({
  shareCode: z.string().min(8),
  expiresAt: z.string().datetime(),
  revoked: z.boolean(),
});
export type DocumentShareView = z.infer<typeof documentShareViewSchema>;
