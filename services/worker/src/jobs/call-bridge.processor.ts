/**
 * Purpose: Consumes `bridge-call` jobs from the `call-bridge` queue and
 * kicks off the VoiceBridgeProvider for a masked call session.
 * Responsibilities: Calls `createBridge`, which itself schedules the
 * ringing/connected/ended webhook callbacks the API applies to the
 * call_sessions row (see providers/voice-bridge.provider.ts).
 * Security: This processor never reads or logs either party's phone
 * number — it only ever handles the opaque `callSessionId`.
 * Related: providers/voice-bridge.provider.ts.
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import type { Job } from 'bullmq';
import { logger } from '@sampark/shared-security';
import { CALL_BRIDGE_QUEUE } from '../queue/queue.module';
import { VOICE_BRIDGE_PROVIDER, type VoiceBridgeProvider } from '../providers/voice-bridge.provider';

@Processor(CALL_BRIDGE_QUEUE)
export class CallBridgeProcessor extends WorkerHost {
  constructor(@Inject(VOICE_BRIDGE_PROVIDER) private readonly voiceBridgeProvider: VoiceBridgeProvider) {
    super();
  }

  async process(job: Job<{ callSessionId: string }>): Promise<void> {
    try {
      await this.voiceBridgeProvider.createBridge(job.data.callSessionId);
    } catch (error) {
      logger.error('Voice bridge creation failed', {
        callSessionId: job.data.callSessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
