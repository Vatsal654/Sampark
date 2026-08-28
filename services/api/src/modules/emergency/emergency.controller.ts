/**
 * Purpose: HTTP surface for owner emergency profile/contacts and the
 * scanner-facing emergency card.
 * Related: emergency.service.ts.
 */
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { emergencyContactSchema, emergencyProfileSchema, type EmergencyContact, type EmergencyProfile } from '@sampark/api-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { EmergencyService } from './emergency.service';

@ApiTags('owner-emergency')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('owner')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Get('emergency-profile')
  getProfile(@CurrentUserId() userId: string) {
    return this.emergencyService.getProfile(userId);
  }

  @Put('emergency-profile')
  updateProfile(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(emergencyProfileSchema)) body: EmergencyProfile,
  ) {
    return this.emergencyService.updateProfile(userId, body);
  }

  @Get('emergency-contacts')
  listContacts(@CurrentUserId() userId: string) {
    return this.emergencyService.listContacts(userId);
  }

  @Post('emergency-contacts')
  addContact(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(emergencyContactSchema)) body: EmergencyContact,
  ) {
    return this.emergencyService.addContact(userId, body);
  }

  @Delete('emergency-contacts/:id')
  async removeContact(@CurrentUserId() userId: string, @Param('id') id: string) {
    await this.emergencyService.removeContact(userId, id);
    return { success: true };
  }
}

@ApiTags('public-scanner')
@Controller('public/tags')
export class PublicEmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Get(':opaqueId/emergency-card')
  getCard(@Param('opaqueId') opaqueId: string, @Query('sig') sig: string) {
    return this.emergencyService.getScannerCard(opaqueId, sig ?? '');
  }
}
