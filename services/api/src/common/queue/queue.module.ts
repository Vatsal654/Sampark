/**
 * Purpose: Registers the BullMQ queues the API enqueues jobs onto; the
 * worker process (services/worker) is what actually consumes them.
 * Responsibilities: Two queues — `notifications` (alert/emergency
 * delivery) and `call-bridge` (masked call session lifecycle).
 * Security: Job payloads must never include a raw phone number for a
 * scanner or owner (docs/THREAT_MODEL.md §3.5) — only IDs the worker
 * resolves itself against the encrypted-at-rest record.
 * Related: services/worker/src/jobs/*, modules/alerts, modules/calls.
 */
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

export const NOTIFICATIONS_QUEUE = 'notifications';
export const CALL_BRIDGE_QUEUE = 'call-bridge';

/** Parses REDIS_URL into the {host,port,username,password,tls} shape BullMQ/ioredis expect. */
export function parseRedisConnection(redisUrl: string) {
  const parsed = new URL(redisUrl);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  };
}

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({ connection: parseRedisConnection(process.env.REDIS_URL ?? 'redis://localhost:6379') }),
    }),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }, { name: CALL_BRIDGE_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
