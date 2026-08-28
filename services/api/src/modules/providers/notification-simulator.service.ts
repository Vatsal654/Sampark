/**
 * Purpose: In-memory record of every mock provider "send" during a dev
 * process, surfaced at GET /dev/simulator so a demo can show OTP/alert/
 * call events without real phones (docs/LOCAL_DEVELOPMENT.md).
 * Responsibilities: `record()` appends an event (capped ring buffer);
 * `list()` returns recent events, most recent first.
 * Security: Disabled entirely in production (see
 * simulator.controller.ts's NODE_ENV guard) — it exists only to make the
 * mock stack demoable, and content passed to it is expected to already be
 * safe-for-display (e.g. OTP codes ARE shown here deliberately, since
 * this is the dev-only channel a real SMS would have used).
 * Related: modules/providers/*.provider.ts, modules/providers/notification-simulator.controller.ts.
 */
import { Injectable } from '@nestjs/common';

export interface SimulatedNotification {
  id: string;
  channel: 'otp' | 'sms' | 'whatsapp' | 'push' | 'voice';
  summary: string;
  recordedAt: string;
}

const MAX_EVENTS = 200;

@Injectable()
export class NotificationSimulatorService {
  private events: SimulatedNotification[] = [];

  record(channel: SimulatedNotification['channel'], summary: string): void {
    this.events.unshift({
      id: crypto.randomUUID(),
      channel,
      summary,
      recordedAt: new Date().toISOString(),
    });
    if (this.events.length > MAX_EVENTS) {
      this.events.length = MAX_EVENTS;
    }
  }

  list(): SimulatedNotification[] {
    return this.events;
  }
}
