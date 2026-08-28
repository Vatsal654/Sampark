# Sampark Worker (`services/worker`)

Background job processor: notification delivery (push → WhatsApp → SMS
fallback), masked-call bridge simulation, and scheduled data retention.

## Layout

```
src/
  main.ts, app.module.ts     bootstrap (no HTTP server — application context only)
  config/                     worker env config (extends shared-config's base schema)
  database/entities.ts        independent entity copies for tables the worker touches
  queue/                      BullMQ queue registration (mirrors services/api)
  providers/                  SmsProvider, WhatsAppProvider, PushProvider,
                               VoiceBridgeProvider — mock + unimplemented-real pairs
  jobs/
    notification-delivery.processor.ts   consumes the `notifications` queue
    call-bridge.processor.ts             consumes the `call-bridge` queue
    retention.job.ts                     scheduled daily sweep
    quiet-hours.ts                       Nepal-time quiet-hours check
```

## Why mock providers call back over HTTP

The mock SMS/WhatsApp/voice providers don't just resolve a promise — they
schedule a signed HTTP callback to the API's `/v1/webhooks/*` routes,
exactly like a real provider's delivery-status webhook would. This
exercises the full signature-verification + idempotency path in
`services/api/src/modules/webhooks` end-to-end in local development and
tests, not just in a hypothetical production integration.

## Running

```bash
cp .env.example .env
npm run start:dev
```

Requires the same Postgres/Redis the API uses, and `API_BASE_URL` pointed
at a running API instance for the webhook callbacks to land anywhere.
