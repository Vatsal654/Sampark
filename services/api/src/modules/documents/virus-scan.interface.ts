/**
 * Purpose: Adapter interface for scanning an uploaded document before it
 * becomes available to the owner, per product spec §4G "virus-scanned
 * before availability".
 * Responsibilities: `scan()` returns clean/infected; the mock always
 * returns clean (no ClamAV or equivalent is wired up in this repo).
 * Security: A document must never transition to `available` without
 * going through this interface — see documents.service.ts.
 * Related: documents.service.ts, mock-virus-scan.provider.ts.
 */
export interface VirusScanProvider {
  scan(buffer: Buffer): Promise<{ clean: boolean }>;
}

export const VIRUS_SCAN_PROVIDER = 'VIRUS_SCAN_PROVIDER';
