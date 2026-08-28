/**
 * Purpose: Worker-specific environment config, extending the shared base
 * schema with the API base URL mock providers call back to.
 * Related: packages/shared-config.
 */
import { Global, Module } from '@nestjs/common';
import { z } from 'zod';
import { baseEnvSchema, loadEnv } from '@sampark/shared-config';

const workerEnvSchema = baseEnvSchema.extend({
  API_BASE_URL: z.string().url().default('http://localhost:3001'),
});

export type WorkerConfig = z.infer<typeof workerEnvSchema>;
export const WORKER_CONFIG = 'WORKER_CONFIG';

@Global()
@Module({
  providers: [{ provide: WORKER_CONFIG, useFactory: () => loadEnv(workerEnvSchema) }],
  exports: [WORKER_CONFIG],
})
export class ConfigModule {}
