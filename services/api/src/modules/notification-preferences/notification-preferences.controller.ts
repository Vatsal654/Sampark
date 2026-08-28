import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { notificationPreferencesSchema, type NotificationPreferences } from '@sampark/api-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { NotificationPreferencesService } from './notification-preferences.service';

@ApiTags('owner-notification-preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('owner/notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly service: NotificationPreferencesService) {}

  @Get()
  get(@CurrentUserId() userId: string) {
    return this.service.get(userId);
  }

  @Put()
  update(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(notificationPreferencesSchema)) body: NotificationPreferences,
  ) {
    return this.service.update(userId, body);
  }
}
