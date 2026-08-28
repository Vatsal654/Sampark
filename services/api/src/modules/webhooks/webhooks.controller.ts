/**
 * Purpose: HTTP surface for inbound provider webhooks.
 * Security: No user-auth guard — providers authenticate via the HMAC
 * signature checked inside WebhooksService, not a session.
 * Related: webhooks.service.ts.
 */
import { Body, Controller, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { WebhooksService } from './webhooks.service';

const envelopeSchema = z.object({
  idempotencyKey: z.string().min(1).max(100),
  eventType: z.string().min(1).max(40),
  timestamp: z.number(),
  signature: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

@ApiExcludeController()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('sms')
  async sms(@Body(new ZodValidationPipe(envelopeSchema)) body: z.infer<typeof envelopeSchema>) {
    await this.webhooksService.verifyAndRecord('sms', body);
    return { received: true };
  }

  @Post('whatsapp')
  async whatsapp(@Body(new ZodValidationPipe(envelopeSchema)) body: z.infer<typeof envelopeSchema>) {
    await this.webhooksService.verifyAndRecord('whatsapp', body);
    return { received: true };
  }

  @Post('voice')
  async voice(@Body(new ZodValidationPipe(envelopeSchema)) body: z.infer<typeof envelopeSchema>) {
    await this.webhooksService.verifyAndRecord('voice', body);
    return { received: true };
  }

  @Post('push')
  async push(@Body(new ZodValidationPipe(envelopeSchema)) body: z.infer<typeof envelopeSchema>) {
    await this.webhooksService.verifyAndRecord('push', body);
    return { received: true };
  }
}
