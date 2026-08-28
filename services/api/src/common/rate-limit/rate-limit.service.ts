/**
 * Purpose: Redis-backed sliding-window rate limiter used across the
 * scanner portal, auth OTP, and masked-call endpoints.
 * Responsibilities: `consume(key, limit, windowSeconds)` atomically
 * increments a counter and returns whether the caller is within budget;
 * `blockFor` sets a hard cooldown key (used for OTP resend cooldowns).
 * Security: Every call site combines multiple keys (IP, tag, phone hash,
 * device fingerprint) per docs/SECURITY.md "Rate limiting & abuse
 * controls" — this service itself is dimension-agnostic and just enforces
 * whatever key it's given.
 * Related: docs/THREAT_MODEL.md §3.1/§3.3/§3.6, modules/public-tag,
 * modules/auth.
 */
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

@Injectable()
export class RateLimitService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Fixed-window counter: allows up to `limit` calls per `windowSeconds` for `key`. */
  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;
    const count = await this.redis.incr(redisKey);
    if (count === 1) {
      await this.redis.expire(redisKey, windowSeconds);
    }
    const ttl = await this.redis.ttl(redisKey);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  }

  /** Sets a hard cooldown (e.g. "cannot resend OTP for 60s") independent of the counter above. */
  async isCoolingDown(key: string): Promise<boolean> {
    const exists = await this.redis.exists(`cooldown:${key}`);
    return exists === 1;
  }

  async startCooldown(key: string, seconds: number): Promise<void> {
    await this.redis.set(`cooldown:${key}`, '1', 'EX', seconds);
  }
}
