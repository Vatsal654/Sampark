import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { recordConsentSchema, deleteAccountRequestSchema, type RecordConsent, type DeleteAccountRequest } from '@sampark/api-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { PrivacyService } from './privacy.service';

@ApiTags('owner-privacy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('owner')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Post('consents')
  async recordConsent(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(recordConsentSchema)) body: RecordConsent,
  ) {
    await this.privacyService.recordConsent(userId, body.consentType, body.granted);
    return { success: true };
  }

  @Get('privacy/export')
  exportData(@CurrentUserId() userId: string) {
    return this.privacyService.exportData(userId);
  }

  @Post('privacy/delete-account')
  requestDeletion(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(deleteAccountRequestSchema)) _body: DeleteAccountRequest,
  ) {
    return this.privacyService.requestDeletion(userId);
  }
}
