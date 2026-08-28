/**
 * Purpose: Dev-only HTTP surface for the notification simulator, letting
 * a local demo see mock OTP/alert/call events without real phones.
 * Responsibilities: GET /dev/simulator — lists recent simulated events.
 * Security: Returns 404 outside development. This endpoint would leak
 * OTP codes if ever reachable in production, so the guard here is
 * load-bearing, not cosmetic.
 * Related: notification-simulator.service.ts, docs/LOCAL_DEVELOPMENT.md.
 */
import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { NotificationSimulatorService } from './notification-simulator.service';

@ApiExcludeController()
@Controller('dev/simulator')
export class NotificationSimulatorController {
  constructor(private readonly simulator: NotificationSimulatorService) {}

  @Get()
  list() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    return { events: this.simulator.list() };
  }
}
