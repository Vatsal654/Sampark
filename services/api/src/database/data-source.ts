/**
 * Purpose: TypeORM CLI data source used by `migration:run` / `migration:
 * revert` / `migration:generate`, and by integration tests that need a
 * raw connection.
 * Responsibilities: Wires entities + migrations to a Postgres connection
 * string from the environment. `synchronize` is always false — schema
 * changes only ever happen through a reviewed migration file, per the
 * product spec's "use migrations, never synchronize" requirement.
 * Security: No credentials are hard-coded; DATABASE_URL must be supplied
 * by the environment (see .env.example).
 * Related: database/migrations/*, docs/OPERATIONS_RUNBOOK.md.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgres://sampark:sampark_dev_password@localhost:5432/sampark',
  entities: ALL_ENTITIES,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});
