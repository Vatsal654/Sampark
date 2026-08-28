/**
 * Purpose: Development-only VirusScanProvider — no real engine is wired
 * up in this codebase (see docs/README.md provider table).
 * Related: virus-scan.interface.ts.
 */
import { Injectable } from '@nestjs/common';
import type { VirusScanProvider } from './virus-scan.interface';

@Injectable()
export class MockVirusScanProvider implements VirusScanProvider {
  async scan(): Promise<{ clean: boolean }> {
    return { clean: true };
  }
}
