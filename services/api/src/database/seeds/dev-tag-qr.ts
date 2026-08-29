/**
 * Purpose: Creates (or resets) exactly one development-only Sampark tag,
 * in the same "issued" state real inventory is in after
 * POST /admin/tags/issue, and prints its real scanner QR to the terminal
 * — so the owner app's existing Activate Tag flow (QR scan -> PIN ->
 * POST /owner/tags/activate) can be exercised end to end without a
 * physical sticker.
 * Responsibilities: Reuses the exact same tag-creation primitives as
 * services/api/src/modules/admin/admin.service.ts#issueTags
 * (generateOpaqueTagId is NOT used here — see below — but
 * bcrypt-hashing the PIN and status: 'issued' are identical) and the
 * exact same signing/URL format seed.ts already prints
 * ("http://localhost:3000/t/{opaqueId}.{signature}"), so the generated
 * tag and its QR are indistinguishable in shape from a real one. This
 * is deliberately a separate script from seed.ts (which seeds a tag
 * that's already 'active') — this one is specifically for exercising
 * the activation flow itself, so it must start 'issued'/unactivated.
 * Security: Refuses to run when NODE_ENV=production, matching every
 * other dev-only affordance in this codebase (mock-otp.provider.ts,
 * notification-simulator.controller.ts, seed.ts). The opaque ID is
 * fixed/deterministic (not generateOpaqueTagId()'s random output) on
 * purpose: a developer re-running this script during testing needs the
 * same QR to scan every time, and a fixed, obviously-not-random hex
 * string ("deadbeef" x4) can never collide with a real tag's ID (which
 * is 128 bits of crypto-random entropy per tag-id.ts — the chance a
 * real issued tag ever lands on this exact value is negligible, and
 * this script only runs in development anyway). None of this touches
 * TagsService.activate() or the production issuance endpoint — it only
 * writes a row shaped like what they already produce.
 * Related: modules/tags/tags.service.ts, modules/admin/admin.service.ts,
 * packages/shared-security/tag-signature.ts, database/seeds/seed.ts.
 */
/* eslint-disable no-console -- CLI script; stdout output is the intended UI */
import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import qrcodeTerminal from 'qrcode-terminal';
import { signTagReference } from '@sampark/shared-security';
import { AppDataSource } from '../data-source';
import { TagEntity } from '../entities';

/** Fixed on purpose — see the file header. Valid per tag-id.ts's ^[0-9a-f]{32}$ pattern. */
export const DEV_TAG_OPAQUE_ID = 'deadbeefdeadbeefdeadbeefdeadbeef';
/** Matches the PIN seed.ts already uses for its demo tag — not a new convention. */
export const DEV_TAG_ACTIVATION_PIN = '123456';
const SCANNER_PORTAL_ORIGIN = 'http://localhost:3000';

const TAG_SIGNING_SECRET = process.env.TAG_SIGNING_SECRET ?? 'dev-only-tag-signing-secret-do-not-use-in-prod-32ch';

/** The exact QR payload format the owner app's scanner and the public scanner portal both expect
 * (packages/shared-security/tag-signature.ts#buildTagPath / apps/mobile's extractOpaqueIdFromScan). */
export function buildDevTagScanUrl(): string {
  const signature = signTagReference(DEV_TAG_OPAQUE_ID, TAG_SIGNING_SECRET);
  return `${SCANNER_PORTAL_ORIGIN}/t/${DEV_TAG_OPAQUE_ID}.${signature}`;
}

/** Extracted so the production gate itself is unit-testable without touching a real database. */
export function assertNotProduction(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to generate a development tag against a production environment.');
  }
}

async function main(): Promise<void> {
  assertNotProduction();

  await AppDataSource.initialize();
  const tags = AppDataSource.getRepository(TagEntity);

  const pinHash = await bcrypt.hash(DEV_TAG_ACTIVATION_PIN, 10);
  let tag = await tags.findOne({ where: { opaqueId: DEV_TAG_OPAQUE_ID } });
  if (tag) {
    // Re-runnable: reset it back to a fresh, unactivated "issued" tag every time, so testing
    // activation repeatedly never requires manually cleaning up the database by hand.
    tag.status = 'issued';
    tag.activationPinHash = pinHash;
    tag.vehicleId = null;
    tag.ownerId = null;
    tag.activatedAt = null;
    tag.previousTagId = null;
    await tags.save(tag);
  } else {
    tag = await tags.save(tags.create({ opaqueId: DEV_TAG_OPAQUE_ID, status: 'issued', activationPinHash: pinHash }));
  }

  const scanUrl = buildDevTagScanUrl();

  console.log('\nDevelopment tag ready (development-only, never valid in production):\n');
  console.log(`  Opaque ID:        ${DEV_TAG_OPAQUE_ID}`);
  console.log(`  Status:           issued (unactivated — ready for the Activate Tag flow)`);
  console.log(`  Activation PIN:   ${DEV_TAG_ACTIVATION_PIN}`);
  console.log(`  QR payload/URL:   ${scanUrl}\n`);
  console.log('Scan the QR below with the Sampark app\'s Activate Tag camera, then enter the PIN above:\n');
  qrcodeTerminal.generate(scanUrl, { small: true }, (qr) => console.log(qr));

  await AppDataSource.destroy();
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
