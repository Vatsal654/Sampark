/**
 * Purpose: Jest `setupFiles` entry — runs in every worker before test
 * code executes, reading the container connection info global-setup.ts
 * wrote and populating process.env so AppModule's ConfigModule (which
 * calls loadEnv() when the Nest app is created inside each test) picks
 * up the real container URLs instead of localhost defaults.
 * Related: global-setup.ts, support/connection-info.ts.
 */
import { readFileSync } from 'node:fs';
import { CONNECTION_INFO_PATH, type ConnectionInfo } from './support/connection-info';

const info = JSON.parse(readFileSync(CONNECTION_INFO_PATH, 'utf8')) as ConnectionInfo;

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = info.databaseUrl;
process.env.REDIS_URL = info.redisUrl;
process.env.JWT_ACCESS_SECRET = 'test-access-secret-not-for-production-use-32ch';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-for-production-use-32c';
process.env.TAG_SIGNING_SECRET = 'test-tag-signing-secret-not-for-production-32c';
process.env.FIELD_ENCRYPTION_ROOT_KEY = 'test-field-encryption-key-not-for-production32';
process.env.PROVIDER_WEBHOOK_SECRET = 'test-provider-webhook-secret-not-for-prod-32ch';
process.env.OTP_PROVIDER = 'mock';
process.env.S3_ENDPOINT = info.s3Endpoint;
process.env.S3_BUCKET = info.s3Bucket;
process.env.S3_ACCESS_KEY_ID = info.s3AccessKeyId;
process.env.S3_SECRET_ACCESS_KEY = info.s3SecretAccessKey;
process.env.FEATURE_DOCUMENT_VAULT = 'true';
process.env.SWAGGER_ENABLED = 'false';
process.env.ADMIN_MOCK_SSO_ENABLED = 'true';
