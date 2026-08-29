/**
 * Purpose: HTTP surface for the owner alert inbox.
 * Related: alerts.service.ts.
 */
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { reportAbuseSchema, type ReportAbuse } from '@sampark/api-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { AlertsService } from './alerts.service';

@ApiTags('owner-alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('owner/alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  list(@CurrentUserId() ownerId: string) {
    return this.alertsService.list(ownerId);
  }

  @Post(':id/acknowledge')
  acknowledge(@CurrentUserId() ownerId: string, @Param('id') id: string) {
    return this.alertsService.acknowledge(ownerId, id);
  }

  @Post(':id/archive')
  archive(@CurrentUserId() ownerId: string, @Param('id') id: string) {
    return this.alertsService.archive(ownerId, id);
  }

  @Post(':id/unarchive')
  unarchive(@CurrentUserId() ownerId: string, @Param('id') id: string) {
    return this.alertsService.unarchive(ownerId, id);
  }

  @Post(':id/report-abuse')
  reportAbuse(
    @CurrentUserId() ownerId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reportAbuseSchema)) body: ReportAbuse,
  ) {
    return this.alertsService.reportAbuse(ownerId, id, body);
  }
}
