import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { NoTagLookupService } from './no-tag-lookup.service';

const requestLookupSchema = z.object({
  plateNumber: z.string().min(4).max(12),
  reason: z.string().min(10).max(280),
});
type RequestLookup = z.infer<typeof requestLookupSchema>;

@ApiTags('owner-no-tag-lookup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('owner/no-tag-lookup')
export class NoTagLookupController {
  constructor(private readonly service: NoTagLookupService) {}

  @Post()
  request(@CurrentUserId() userId: string, @Body(new ZodValidationPipe(requestLookupSchema)) body: RequestLookup) {
    return this.service.requestLookup(userId, body.plateNumber, body.reason);
  }
}
