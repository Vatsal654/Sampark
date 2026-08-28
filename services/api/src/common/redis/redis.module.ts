/**
 * Purpose: Provides a single shared ioredis client for rate limiting, OTP/
 * session ephemeral state, and (indirectly, via config) BullMQ.
 * Responsibilities: Registers a `REDIS_CLIENT` provider token consumed by
 * RateLimitService and other modules that need direct Redis access.
 * Security: Connection string comes only from env (REDIS_URL); no
 * hard-coded connection details.
 * Related: common/rate-limit, modules/auth (OTP), modules/public-tag.
 */
import { Global, Module, OnModuleDestroy } from '@nestjs/common';
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
  constructor() {}

  async onModuleDestroy(): Promise<void> {
    // Individual providers close their own connections via Nest's DI teardown.
  }
}
