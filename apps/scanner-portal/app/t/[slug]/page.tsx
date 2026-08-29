/**
 * Purpose: Route entry point for a scanned tag URL, shaped
 * /t/{opaqueId}.{signature} per docs/ARCHITECTURE.md §6.
 * Responsibilities: Splits the combined slug into its two parts and hands
 * off to the client-side TagScanScreen — no server-side data fetching or
 * caching here, since a personalized per-tag response must never be
 * cached (docs' "no vehicle plate, owner phone... in the URL" +
 * "do not cache personalized results" requirements).
 * Related: components/TagScanScreen.tsx.
 */
import { TagScanScreen } from '../../../components/TagScanScreen';
import { InvalidLinkScreen } from '../../../components/InvalidLinkScreen';

export const dynamic = 'force-dynamic';

function parseSlug(slug: string): { opaqueId: string; signature: string } | null {
  const dotIndex = slug.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === slug.length - 1) return null;
  return { opaqueId: slug.slice(0, dotIndex), signature: slug.slice(dotIndex + 1) };
}

export default function TagPage({ params }: { params: { slug: string } }) {
  const parsed = parseSlug(decodeURIComponent(params.slug));
  if (!parsed) {
    return <InvalidLinkScreen />;
  }
  return <TagScanScreen opaqueId={parsed.opaqueId} signature={parsed.signature} />;
}
