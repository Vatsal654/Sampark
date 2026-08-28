# Sampark Scanner Portal (`apps/scanner-portal`)

The public, no-login web experience a scanner reaches by scanning a
vehicle's QR/NFC tag. Optimized for low-end devices and slow mobile data:
no UI framework, no analytics/trackers, no heavy client bundle.

## Routes

- `/` — fallback explainer for anyone who reaches the bare domain.
- `/t/[opaqueId].[signature]` — the actual scanner experience. All tag
  resolution, alert submission, emergency flow, callback OTP flow, and
  tag reporting happen client-side against the API from this one route
  (see `components/TagScanScreen.tsx`).

## Running

```bash
cp .env.example .env.local
npm run dev
```

## Testing

```bash
npm run typecheck
npm run test:e2e   # Playwright, see e2e/
```
