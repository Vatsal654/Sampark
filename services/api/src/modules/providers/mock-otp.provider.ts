/**
 * Purpose: Development-only OtpProvider that "delivers" a code by
 * recording it to the notification simulator instead of calling a real
 * SMS/voice aggregator.
 * Responsibilities: Implements OtpProvider.sendOtp.
 * Security: This mock deliberately makes the OTP code visible via
 * /dev/simulator — that endpoint is disabled outside development (see
 * notification-simulator.controller.ts) precisely because this is not
 * safe in any other environment.
 * Related: otp-provider.interface.ts, providers.module.ts.
 */
import { Injectable } from '@nestjs/common';
import { maskPhoneForDisplay } from '@sampark/shared-security';
import type { OtpProvider } from './otp-provider.interface';
import { NotificationSimulatorService } from './notification-simulator.service';

@Injectable()
export class MockOtpProvider implements OtpProvider {
  constructor(private readonly simulator: NotificationSimulatorService) {}

  async sendOtp(phoneE164: string, code: string): Promise<{ providerMessageId: string }> {
    this.simulator.record('otp', `OTP ${code} for ${maskPhoneForDisplay(phoneE164)} (dev mock, not really sent)`);
    return { providerMessageId: `mock-otp-${crypto.randomUUID()}` };
  }
}
