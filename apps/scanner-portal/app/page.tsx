/**
 * Purpose: Fallback landing page for visitors who reach the portal
 * without a tag link (e.g. typed the bare domain). The real product
 * entry point is always /t/{opaqueId}.{signature} from a QR/NFC scan.
 */
export default function HomePage() {
  return (
    <main>
      <h1>Sampark</h1>
      <p>
        Sampark lets someone contact a vehicle owner safely — without seeing their phone number —
        by scanning a QR code or tapping an NFC tag on the vehicle.
      </p>
      <p>To use Sampark, scan the tag on the vehicle you&apos;re trying to reach.</p>
    </main>
  );
}
