/**
 * Purpose: Boots a full Nest application (same module graph as
 * production) against the containerized test database for e2e/security
 * specs to exercise via supertest.
 * Related: src/app.module.ts, src/main.ts.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { RedactedExceptionFilter } from '../../src/common/filters/redacted-exception.filter';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalFilters(new RedactedExceptionFilter());
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  await app.init();
  return app;
}
