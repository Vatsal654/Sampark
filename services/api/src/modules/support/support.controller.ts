import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createSupportTicketSchema, type CreateSupportTicket } from '@sampark/api-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { SupportService } from './support.service';

@ApiTags('owner-support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('owner/support-tickets')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body(new ZodValidationPipe(createSupportTicketSchema)) body: CreateSupportTicket) {
    return this.supportService.create(userId, body.subject, body.description);
  }

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.supportService.list(userId);
  }
}
