/**
 * Purpose: Stops the containers started by global-setup.ts. Best-effort —
 * testcontainers' Ryuk reaper also cleans these up if this somehow
 * doesn't run.
 */
import { existsSync, rmSync } from 'node:fs';
import { CONNECTION_INFO_PATH } from './support/connection-info';

interface StartedContainerLike {
  stop: () => Promise<unknown>;
}

export default async function globalTeardown(): Promise<void> {
  const stash = (
    globalThis as unknown as {
      __SAMPARK_TEST_CONTAINERS__?: { postgres: StartedContainerLike; redis: StartedContainerLike; minio: StartedContainerLike };
    }
  ).__SAMPARK_TEST_CONTAINERS__;
  if (stash) {
    await Promise.allSettled([stash.postgres.stop(), stash.redis.stop(), stash.minio.stop()]);
  }
  if (existsSync(CONNECTION_INFO_PATH)) {
    rmSync(CONNECTION_INFO_PATH);
  }
}
