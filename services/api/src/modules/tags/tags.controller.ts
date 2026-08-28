/**
 * Purpose: HTTP surface for owner tag lifecycle actions.
 * Security: JwtAuthGuard on every route; ownership enforced in
 * TagsService using the authenticated userId.
 * Related: tags.service.ts, packages/api-contracts/src/vehicle.ts.
 */
import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { activateTagSchema, reassignTagSchema, type ActivateTag, type ReassignTag } from '@sampark/api-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { TagsService } from './tags.service';

@ApiTags('owner-tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('owner/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post('activate')
  activate(@CurrentUserId() ownerId: string, @Body(new ZodValidationPipe(activateTagSchema)) body: ActivateTag) {
    return this.tagsService.activate(ownerId, body.opaqueId, body.activationPin, body.vehicleId);
  }

  @Post(':id/pause')
  pause(@CurrentUserId() ownerId: string, @Param('id') id: string) {
    return this.tagsService.pause(ownerId, id);
  }

  @Post(':id/resume')
  resume(@CurrentUserId() ownerId: string, @Param('id') id: string) {
    return this.tagsService.resume(ownerId, id);
  }

  @Post(':id/report-lost')
  reportLost(@CurrentUserId() ownerId: string, @Param('id') id: string) {
    return this.tagsService.reportLost(ownerId, id);
  }

  @Post(':id/replace')
  requestReplacement(@CurrentUserId() ownerId: string, @Param('id') id: string) {
    return this.tagsService.requestReplacement(ownerId, id);
  }

  @Post('reassign')
  reassign(@CurrentUserId() ownerId: string, @Body(new ZodValidationPipe(reassignTagSchema)) body: ReassignTag) {
    return this.tagsService.reassign(ownerId, body.tagId, body.newVehicleId, body.reauthToken);
  }
}
