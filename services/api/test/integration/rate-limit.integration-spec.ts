/**
 * Purpose: Integration test for RateLimitService against a real Redis
 * container — verifies the sliding-window counter and cooldown behavior
 * that every abuse-control call site in the API depends on.
 */
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../src/common/redis/redis.module';
import { RateLimitService } from '../../src/common/rate-limit/rate-limit.service';

describe('RateLimitService (integration, real Redis)', () => {
  let service: RateLimitService;
  let redis: Redis;

  beforeAll(async () => {
    redis = new Redis(process.env.REDIS_URL!);
    const moduleRef = await Test.createTestingModule({
      providers: [RateLimitService, { provide: REDIS_CLIENT, useValue: redis }],
    }).compile();
    service = moduleRef.get(RateLimitService);
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('allows requests up to the limit and blocks the next one', async () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    for (let i = 0; i < 3; i += 1) {
      const result = await service.consume(key, 3, 60);
      expect(result.allowed).toBe(true);
    }
    const blocked = await service.consume(key, 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('resets after the window expires', async () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    await service.consume(key, 1, 1);
    const blocked = await service.consume(key, 1, 1);
    expect(blocked.allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 1200));
    const afterWindow = await service.consume(key, 1, 1);
    expect(afterWindow.allowed).toBe(true);
  });

  it('tracks a cooldown independently of the counter', async () => {
    const key = `cooldown-test:${Date.now()}`;
    expect(await service.isCoolingDown(key)).toBe(false);
    await service.startCooldown(key, 2);
    expect(await service.isCoolingDown(key)).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 2200));
    expect(await service.isCoolingDown(key)).toBe(false);
  });
});
