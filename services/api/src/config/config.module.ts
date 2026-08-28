/**
 * Purpose: Wires the shared, zod-validated environment config
 * (packages/shared-config) into Nest's DI as a global provider.
 * Responsibilities: Parses `process.env` once at boot and exposes the
 * frozen, typed result under the APP_CONFIG token.
 * Security: Fails fast (throws) on missing/invalid secrets rather than
 * booting with an insecure default — see shared-config/env.ts.
 * Related: packages/shared-config, every module that injects APP_CONFIG.
 */
import { Global, Module } from '@nestjs/common';
import { baseEnvSchema, loadEnv, type BaseEnv } from '@sampark/shared-config';

export const APP_CONFIG = 'APP_CONFIG';
export type AppConfig = BaseEnv;

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useValue: loadEnv(baseEnvSchema) }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
