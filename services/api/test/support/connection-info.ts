/**
 * Purpose: Shared path constant for the temp file globalSetup writes
 * container connection info to, read back by env-setup.ts in each worker.
 */
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export const CONNECTION_INFO_PATH = join(tmpdir(), 'sampark-test-containers.json');

export interface ConnectionInfo {
  databaseUrl: string;
  redisUrl: string;
  s3Endpoint: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
}
