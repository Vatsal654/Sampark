# Sampark — Data Flow

## 1. Tag provisioning → activation

```
[Fulfilment/ops] --creates--> tag row (status=manufactured)
                              opaque_id + signature keypair issued
[Shipment]        --ships--> tag_shipments row, status=issued
[Owner scans QR for the first time, unauthenticated]
   -> scanner portal shows "This tag is not yet activated"
[Owner opens app, logs in, scans same QR or enters activation code]
   -> POST /owner/tags/activate { opaqueId, activationPin }
   -> API verifies signature + pin + auth, creates tag_activation_challenge,
      binds tag to vehicle, status -> active
   -> audit_events entry written
```

## 2. Anonymous alert

```
Scanner device --HTTPS--> Scanner Portal (Next.js, no PII collected)
Scanner Portal --HTTPS--> API POST /public/tags/:id/alerts
API: validate signature+status, rate-limit check, create alert_event
API --enqueue--> BullMQ "alert-delivery" job
Worker: load owner notification_preferences
Worker --> PushProvider / WhatsAppProvider / SmsProvider (in preference order)
Worker: write alert_delivery rows per channel/attempt
Owner App <--push/poll-- alert appears in Alerts Inbox
```

No scanner-identifying data is created for this path beyond a hashed
abuse-prevention fingerprint with a short TTL.

## 3. Masked callback

```
Scanner Portal -> POST /public/tags/:id/call/otp {phone}
API -> OtpProvider.send() (mock in dev), otp_challenges row (hashed code)
Scanner Portal -> POST /public/tags/:id/call/verify {phone, code}
API -> issues single-use scan_session token
Scanner Portal -> POST /public/tags/:id/call/request {scan_session}
API -> creates call_sessions row (status=pending), enqueues bridge job
Worker -> VoiceBridgeProvider.createBridge(ownerRef, scannerRef)
         (mock provider simulates ringing/connected/ended webhooks)
Provider --webhook--> API /webhooks/voice (signature+idempotency verified)
API -> updates call_sessions.status, never persists raw numbers together
        with any client-readable identifier
```

## 4. Emergency flow

```
Scanner Portal -> POST /public/tags/:id/emergency {category, location?}
API: higher-priority queue, create alert_event(severity=emergency)
Worker: notify owner + verified emergency_contacts via push -> WhatsApp
        approved template -> SMS fallback, each idempotent + retried
Owner App: Emergency Card fields shown only if scanner explicitly
           confirmed "this is an emergency" AND owner enabled the field
```

## 5. Document vault

```
Owner App -> POST /owner/documents (multipart, size/type limited)
API -> stream to virus scan adapter -> private S3-compatible bucket
        (object key is a random UUID, never derived from plate/user data)
API -> documents row created, status=pending_scan -> available
Owner App -> GET /owner/documents/:id/url
API -> issues short-lived signed URL (<=5 min), authorization re-checked
Inspector share -> owner generates document_access_grants row with
        expiry + single view code; grant is revocable and audit logged
```

## 6. Retention & deletion

The worker's `retention.job.ts` runs on a schedule and, per
`RETENTION_*` env config: anonymizes `alert_events`/`scan_sessions` older
than their retention window, purges expired `otp_challenges` and
`call_sessions`, and processes owner-initiated account-deletion requests
by cascading a documented deletion/anonymization plan (see
`docs/PRIVACY_DATA_MAP.md` §"Deletion behavior").
