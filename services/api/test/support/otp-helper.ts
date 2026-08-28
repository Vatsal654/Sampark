/**
 * Purpose: Test-only helper to read the most recently "sent" mock OTP
 * code back out of the notification simulator, since the real API never
 * returns a code in any response body.
 * Related: src/modules/providers/notification-simulator.controller.ts.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function readLatestOtpCode(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer()).get('/v1/dev/simulator').expect(200);
  const events = response.body.events as Array<{ channel: string; summary: string }>;
  const latest = events.find((event) => event.channel === 'otp');
  if (!latest) throw new Error('No OTP event recorded by the simulator');
  const match = /OTP (\d{6})/.exec(latest.summary);
  if (!match) throw new Error(`Could not parse OTP code from: ${latest.summary}`);
  return match[1]!;
}
