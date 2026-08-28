/**
 * Purpose: Bootstraps the worker as a Nest application context (no HTTP
 * server) so BullMQ processors and the scheduled retention job run.
 * Related: app.module.ts.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(AppModule);
  // eslint-disable-next-line no-console -- startup banner, not request-scoped logging
  console.log('Sampark worker running (notification delivery, call bridging, retention).');
}

bootstrap();
