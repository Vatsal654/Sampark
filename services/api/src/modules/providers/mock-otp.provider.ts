/**
 * Purpose: Development-only OtpProvider that "delivers" a code by
 * recording it to the notification simulator instead of calling a real
 * SMS/voice aggregator.
 * Responsibilities: Implements OtpProvider.sendOtp. Also prints the code
 * straight to stdout so a developer watching the API terminal sees it
 * immediately, without needing to know about GET /v1/dev/simulator.
 * Security: This class is only ever selected when OTP_PROVIDER=mock (see
 * providers.module.ts) — a real deployment sets OTP_PROVIDER=aggregator
 * and gets UnimplementedOtpProvider instead, so this code never runs
 * against real traffic. As defense in depth, the stdout print below is
 * ALSO independently gated on NODE_ENV !== 'production' and deliberately
 * bypasses the shared redacting logger (which would otherwise mask the
 * very 6-digit code this exists to show) — do not reuse this pattern
 * anywhere outside a mock provider. /dev/simulator (see
 * notification-simulator.controller.ts) is the same information, gated
 * the same way, for when the terminal output has scrolled past.
 * Related: otp-provider.interface.ts, providers.module.ts,
 * notification-simulator.controller.ts, docs/LOCAL_DEVELOPMENT.md.
 */
import { Injectable } from '@nestjs/common';
import { maskPhoneForDisplay } from '@sampark/shared-security';
import type { OtpProvider } from './otp-provider.interface';
import { NotificationSimulatorService } from './notification-simulator.service';

@Injectable()
export class MockOtpProvider implements OtpProvider {
  constructor(private readonly simulator: NotificationSimulatorService) {}

  async sendOtp(phoneE164: string, code: string): Promise<{ providerMessageId: string }> {
    const maskedPhone = maskPhoneForDisplay(phoneE164);
    this.simulator.record('otp', `OTP ${code} for ${maskedPhone} (dev mock, not really sent)`);

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console -- intentional dev-only OTP print, see class header
      console.log(`[DEV ONLY — mock OTP] code ${code} for ${maskedPhone} (not a real SMS)`);
    }

    return { providerMessageId: `mock-otp-${crypto.randomUUID()}` };
  }
}
