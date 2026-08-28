/**
 * Purpose: Adapter interface + mock/unimplemented implementations for
 * push notification delivery (Firebase Cloud Messaging in production).
 * Security: Push payloads must stay generic on the lock screen ("You have
 * a Sampark vehicle alert") — the caller (notification-delivery.processor.ts)
 * is responsible for keeping the body generic, not this provider.
 * Related: jobs/notification-delivery.processor.ts.
 */
import { Injectable, NotImplementedException } from '@nestjs/common';
import { logger } from '@sampark/shared-security';
import { WORKER_CONFIG, type WorkerConfig } from '../config/config.module';

export interface PushProvider {
  send(userId: string, title: string, body: string): Promise<{ providerMessageId: string }>;
}

export const PUSH_PROVIDER = 'PUSH_PROVIDER';

@Injectable()
export class MockPushProvider implements PushProvider {
  async send(userId: string, title: string, body: string): Promise<{ providerMessageId: string }> {
    logger.info('Mock push send', { userId, title, body });
    return { providerMessageId: `mock-push-${crypto.randomUUID()}` };
  }
}

@Injectable()
export class UnimplementedPushProvider implements PushProvider {
  async send(): Promise<{ providerMessageId: string }> {
    throw new NotImplementedException('No Firebase Cloud Messaging service account is configured.');
  }
}

export function pushProviderFactory(config: WorkerConfig, mock: MockPushProvider, real: UnimplementedPushProvider): PushProvider {
  return config.PUSH_PROVIDER === 'mock' ? mock : real;
}
export const PUSH_PROVIDER_FACTORY = { provide: PUSH_PROVIDER, useFactory: pushProviderFactory, inject: [WORKER_CONFIG, MockPushProvider, UnimplementedPushProvider] };
