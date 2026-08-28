/**
 * Purpose: Adapter interface + mock/unimplemented implementations for
 * masked-call bridging (docs/ARCHITECTURE.md §7, docs/DECISIONS.md ADR-4).
 * Responsibilities: `createBridge` is the only component in the whole
 * system that would, in a real implementation, hold both parties' phone
 * numbers simultaneously — and only in-memory, for the call's duration.
 * Security: The mock never touches a real phone number at all (there is
 * no live call), which is why live bridging stays behind
 * FEATURE_LIVE_CALL_BRIDGING even with this mock fully wired — the mock
 * proves the session-lifecycle/webhook plumbing works, not that calling
 * is safe to enable. See docs/THREAT_MODEL.md §3.5.
 * Related: webhook-caller.ts, jobs/call-bridge.processor.ts.
 */
import { Injectable, NotImplementedException } from '@nestjs/common';
import { logger } from '@sampark/shared-security';
import { WORKER_CONFIG, type WorkerConfig } from '../config/config.module';
import { WebhookCallerService } from './webhook-caller';

export interface VoiceBridgeProvider {
  createBridge(callSessionId: string): Promise<{ providerBridgeReference: string }>;
}

export const VOICE_BRIDGE_PROVIDER = 'VOICE_BRIDGE_PROVIDER';

@Injectable()
export class MockVoiceBridgeProvider implements VoiceBridgeProvider {
  constructor(private readonly webhookCaller: WebhookCallerService) {}

  async createBridge(callSessionId: string): Promise<{ providerBridgeReference: string }> {
    const providerBridgeReference = `mock-bridge-${crypto.randomUUID()}`;
    logger.info('Mock voice bridge created', { callSessionId, providerBridgeReference });

    // Simulate a realistic ringing -> connected -> ended lifecycle via signed webhook callbacks,
    // exercising the exact same code path a real telecom partner's webhooks would use.
    setTimeout(() => void this.webhookCaller.send('voice', 'ringing', { callSessionId, providerBridgeReference }), 1000);
    setTimeout(() => void this.webhookCaller.send('voice', 'connected', { callSessionId, providerBridgeReference }), 4000);
    setTimeout(() => void this.webhookCaller.send('voice', 'ended', { callSessionId, providerBridgeReference }), 15000);

    return { providerBridgeReference };
  }
}

@Injectable()
export class UnimplementedVoiceBridgeProvider implements VoiceBridgeProvider {
  async createBridge(): Promise<{ providerBridgeReference: string }> {
    throw new NotImplementedException(
      'No licensed Nepal telecom/voice-bridge partner is configured. See docs/DECISIONS.md ADR-4.',
    );
  }
}

export function voiceBridgeProviderFactory(
  config: WorkerConfig,
  mock: MockVoiceBridgeProvider,
  real: UnimplementedVoiceBridgeProvider,
): VoiceBridgeProvider {
  return config.VOICE_PROVIDER === 'mock' ? mock : real;
}
export const VOICE_BRIDGE_PROVIDER_FACTORY = {
  provide: VOICE_BRIDGE_PROVIDER,
  useFactory: voiceBridgeProviderFactory,
  inject: [WORKER_CONFIG, MockVoiceBridgeProvider, UnimplementedVoiceBridgeProvider],
};
