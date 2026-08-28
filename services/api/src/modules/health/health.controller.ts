/**
 * Purpose: Liveness/readiness endpoint for orchestrators (Cloud Run
 * health checks, docker-compose healthcheck).
 * Responsibilities: Pings Postgres and Redis; returns 503 if either is
 * unreachable so the platform can avoid routing traffic to a broken
 * instance.
 * Related: docs/OPERATIONS_RUNBOOK.md "Health & monitoring".
 */
import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    const [dbOk, redisOk] = await Promise.all([this.checkDb(), this.checkRedis()]);
    if (!dbOk || !redisOk) {
      throw new ServiceUnavailableException({ database: dbOk, redis: redisOk });
    }
    return { status: 'ok', database: dbOk, redis: redisOk };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
