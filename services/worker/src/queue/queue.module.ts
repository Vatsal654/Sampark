import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

export const NOTIFICATIONS_QUEUE = 'notifications';
export const CALL_BRIDGE_QUEUE = 'call-bridge';

function parseRedisConnection(redisUrl: string) {
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
