/**
 * Purpose: Boots a full Nest application (same module graph as
 * production) against the containerized test database for e2e/security
 * specs to exercise via supertest.
 * Responsibilities: Mirrors main.ts's bootstrap() as closely as an
 * in-process test app can — this used to omit app.enableCors(...)
 * entirely, which meant no e2e spec in this codebase could ever
 * exercise real CORS behavior (see test/e2e/cors.e2e-spec.ts, added
 * alongside this fix, for why that mattered: a real bug in
 * CORS_ALLOWED_ORIGINS handling shipped and went undetected because
 * nothing here ever set the header the browser actually checks).
 * Related: src/app.module.ts, src/main.ts.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { baseEnvSchema, loadEnv } from '@sampark/shared-config';
import { AppModule } from '../../src/app.module';
import { RedactedExceptionFilter } from '../../src/common/filters/redacted-exception.filter';

export async function createTestApp(): Promise<INestApplication> {
  const config = loadEnv(baseEnvSchema);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.enableCors({ origin: config.CORS_ALLOWED_ORIGINS, credentials: true });
  app.useGlobalFilters(new RedactedExceptionFilter());
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  await app.init();
  return app;
}
