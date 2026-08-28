/**
 * Purpose: Single source of truth for environment configuration shape,
 * shared by services/api and services/worker so both processes fail fast
 * and identically on missing/invalid config.
 * Responsibilities: Defines a zod schema per deployable, parses
 * `process.env`, and returns a frozen, typed config object.
 * Security: Never logs the parsed config (it contains secrets); callers
 * must not `console.log` the return value. Defaults for feature flags are
 * deliberately safe (off) — see FEATURE_* below.
 * Related: services/api/src/main.ts, services/worker/src/main.ts,
 * docs/DEPLOYMENT.md, every .env.example file.
 */
import { z } from 'zod';

const boolFromEnv = z
  .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .transform((v) => v === 'true' || v === '1')
  .default('false');

/** Shared config used by both the API and the worker processes. */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(2592000),

  TAG_SIGNING_SECRET: z.string().min(32, 'TAG_SIGNING_SECRET must be at least 32 characters'),
  FIELD_ENCRYPTION_ROOT_KEY: z
    .string()
    .min(32, 'FIELD_ENCRYPTION_ROOT_KEY must be at least 32 characters (dev key; use KMS in prod)'),

  // Feature flags — every one defaults to OFF. See docs/DECISIONS.md ADR-4/5/9.
  FEATURE_LIVE_CALL_BRIDGING: boolFromEnv,
  FEATURE_REAL_SMS: boolFromEnv,
  FEATURE_REAL_WHATSAPP: boolFromEnv,
  FEATURE_DOCUMENT_VAULT: boolFromEnv,
  FEATURE_NO_TAG_LOOKUP: boolFromEnv,
  FEATURE_REAL_PAYMENTS: boolFromEnv,

  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  SMS_PROVIDER: z.enum(['mock', 'aggregator']).default('mock'),
  WHATSAPP_PROVIDER: z.enum(['mock', 'meta']).default('mock'),
  VOICE_PROVIDER: z.enum(['mock', 'telecom-partner']).default('mock'),
  OTP_PROVIDER: z.enum(['mock', 'aggregator']).default('mock'),
  PUSH_PROVIDER: z.enum(['mock', 'fcm']).default('mock'),
  CAPTCHA_PROVIDER: z.enum(['none', 'hcaptcha', 'turnstile']).default('none'),

  RETENTION_SCAN_SESSION_DAYS: z.coerce.number().int().positive().default(30),
  RETENTION_ALERT_EVENT_DAYS: z.coerce.number().int().positive().default(180),
  ACCOUNT_DELETION_GRACE_DAYS: z.coerce.number().int().positive().default(30),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3002')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

/** Parses and validates process.env against a schema, throwing with a clear message on failure. */
export function loadEnv<TSchema extends typeof baseEnvSchema>(
  schema: TSchema,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<TSchema> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return Object.freeze(result.data);
}
