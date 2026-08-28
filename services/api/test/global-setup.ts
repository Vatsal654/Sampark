/**
 * Purpose: Jest globalSetup for integration/e2e runs — starts real
 * Postgres and Redis containers once for the whole test run, runs
 * migrations, and writes connection details to a temp file that each
 * worker process reads via test/env-setup.ts.
 * Related: test/env-setup.ts, test/global-teardown.ts, jest.integration.config.js,
 * jest.e2e.config.js.
 */
import { writeFileSync } from 'node:fs';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { GenericContainer, Wait } from 'testcontainers';
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/entities';
import { InitialSchema1700000000000 } from '../src/database/migrations/1700000000000-InitialSchema';
import { CONNECTION_INFO_PATH } from './support/connection-info';

const MINIO_ROOT_USER = 'sampark_test_minio';
const MINIO_ROOT_PASSWORD = 'sampark_test_minio_secret';
const MINIO_BUCKET = 'sampark-documents-test';

export default async function globalSetup(): Promise<void> {
  const postgres = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('sampark_test')
    .withUsername('sampark')
    .withPassword('sampark_test_password')
    .start();
  const redis = await new RedisContainer('redis:7-alpine').start();
  const minio = await new GenericContainer('minio/minio:latest')
    .withEnvironment({ MINIO_ROOT_USER, MINIO_ROOT_PASSWORD })
    .withCommand(['server', '/data'])
    .withExposedPorts(9000)
    .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000))
    .start();

  const databaseUrl = postgres.getConnectionUri();
  const redisUrl = `redis://${redis.getHost()}:${redis.getPort()}`;
  const s3Endpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`;

  const s3Client = new S3Client({
    endpoint: s3Endpoint,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: MINIO_ROOT_USER, secretAccessKey: MINIO_ROOT_PASSWORD },
  });
  await s3Client.send(new CreateBucketCommand({ Bucket: MINIO_BUCKET }));

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: ALL_ENTITIES,
    migrations: [InitialSchema1700000000000],
    synchronize: false,
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.destroy();

  writeFileSync(
    CONNECTION_INFO_PATH,
    JSON.stringify({
      databaseUrl,
      redisUrl,
      s3Endpoint,
      s3Bucket: MINIO_BUCKET,
      s3AccessKeyId: MINIO_ROOT_USER,
      s3SecretAccessKey: MINIO_ROOT_PASSWORD,
    }),
  );

  // Stash containers on globalThis so global-teardown (same process) can stop them cleanly.
  (globalThis as unknown as { __SAMPARK_TEST_CONTAINERS__: unknown }).__SAMPARK_TEST_CONTAINERS__ = {
    postgres,
    redis,
    minio,
  };
}
