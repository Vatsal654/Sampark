/**
 * Purpose: Provides a single shared ioredis client for rate limiting, OTP/
 * session ephemeral state, and (indirectly, via config) BullMQ.
 * Responsibilities: Registers a `REDIS_CLIENT` provider token consumed by
 * RateLimitService and other modules that need direct Redis access, and
 * closes that connection when the application shuts down.
 * Security: Connection string comes only from env (REDIS_URL); no
 * hard-coded connection details.
 * Related: common/rate-limit, modules/auth (OTP), modules/public-tag.
 */
import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: false }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    // The raw ioredis instance from the factory above has no Nest lifecycle hooks of its own —
    // this is the one place that actually closes it, so `app.close()` (production shutdown, or
    // a test's afterAll) doesn't leave a dangling TCP connection / open Jest handle behind.
    await this.redis.quit();
  }
}
