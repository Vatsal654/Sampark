/**
 * Purpose: Placeholder selected when OTP_PROVIDER=aggregator but no real
 * Nepal-licensed aggregator contract/credentials exist yet.
 * Responsibilities: Implements the same interface as the mock so the
 * DI wiring in providers.module.ts is symmetric, but fails loudly instead
 * of pretending to send a real message.
 * Security: Failing loudly here is intentional — silently falling back to
 * the mock in a production-flagged environment would create a false
 * safety impression. See docs/DECISIONS.md ADR-9.
 * Related: otp-provider.interface.ts, providers.module.ts.
 */
import { Injectable, NotImplementedException } from '@nestjs/common';
import type { OtpProvider } from './otp-provider.interface';

@Injectable()
export class UnimplementedOtpProvider implements OtpProvider {
  async sendOtp(): Promise<{ providerMessageId: string }> {
    throw new NotImplementedException(
      'No Nepal-licensed OTP/SMS aggregator is configured. Set OTP_PROVIDER=mock for development, ' +
        'or wire a real adapter here once a provider contract exists (see docs/DEPLOYMENT.md).',
    );
  }
}
