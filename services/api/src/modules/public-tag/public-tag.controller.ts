/**
 * Purpose: HTTP surface for the unauthenticated scanner portal.
 * Responsibilities: Wires each public.ts contract to PublicTagService.
 * Security: No guard on this controller by design — authorization here is
 * "does the signature verify + is the tag in an interactable state", not
 * a login. Every body is validated with ZodValidationPipe before it
 * reaches the service.
 * Related: public-tag.service.ts, packages/api-contracts/src/public.ts,
 * apps/scanner-portal.
 */
import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  submitAlertRequestSchema,
  submitEmergencyRequestSchema,
  reportTagRequestSchema,
  requestCallOtpSchema,
  verifyCallOtpSchema,
  requestMaskedCallSchema,
  type SubmitAlertRequest,
  type SubmitEmergencyRequest,
  type ReportTagRequest,
  type RequestCallOtp,
  type VerifyCallOtp,
  type RequestMaskedCall,
} from '@sampark/api-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PublicTagService } from './public-tag.service';

function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

@ApiTags('public-scanner')
@Controller('public/tags')
export class PublicTagController {
  constructor(private readonly publicTagService: PublicTagService) {}

  @Get(':opaqueId')
  resolve(@Param('opaqueId') opaqueId: string, @Query('sig') sig: string, @Req() req: Request) {
    return this.publicTagService.resolveTag(opaqueId, sig ?? '', clientIp(req));
  }

  @Post(':opaqueId/alerts')
  submitAlert(
    @Param('opaqueId') opaqueId: string,
    @Query('sig') sig: string,
    @Req() req: Request,
    @Body(new ZodValidationPipe(submitAlertRequestSchema)) body: SubmitAlertRequest,
  ) {
    return this.publicTagService.submitAlert(opaqueId, sig ?? '', clientIp(req), body);
  }

  @Post(':opaqueId/emergency')
  submitEmergency(
    @Param('opaqueId') opaqueId: string,
    @Query('sig') sig: string,
    @Req() req: Request,
    @Body(new ZodValidationPipe(submitEmergencyRequestSchema)) body: SubmitEmergencyRequest,
  ) {
    return this.publicTagService.submitEmergency(opaqueId, sig ?? '', clientIp(req), body);
  }

  @Post(':opaqueId/report')
  reportTag(
    @Param('opaqueId') opaqueId: string,
    @Query('sig') sig: string,
    @Body(new ZodValidationPipe(reportTagRequestSchema)) body: ReportTagRequest,
  ) {
    return this.publicTagService.reportTag(opaqueId, sig ?? '', body);
  }

  @Post(':opaqueId/call/otp')
  requestCallOtp(
    @Param('opaqueId') opaqueId: string,
    @Query('sig') sig: string,
    @Req() req: Request,
    @Body(new ZodValidationPipe(requestCallOtpSchema)) body: RequestCallOtp,
  ) {
    return this.publicTagService.requestCallOtp(opaqueId, sig ?? '', clientIp(req), body.phoneE164);
  }

  @Post(':opaqueId/call/verify')
  verifyCallOtp(
    @Param('opaqueId') opaqueId: string,
    @Query('sig') sig: string,
    @Body(new ZodValidationPipe(verifyCallOtpSchema)) body: VerifyCallOtp,
  ) {
    return this.publicTagService.verifyCallOtp(opaqueId, sig ?? '', body.phoneE164, body.code);
  }

  @Post(':opaqueId/call/request')
  requestMaskedCall(
    @Param('opaqueId') opaqueId: string,
    @Query('sig') sig: string,
    @Body(new ZodValidationPipe(requestMaskedCallSchema)) body: RequestMaskedCall,
  ) {
    return this.publicTagService.requestMaskedCall(opaqueId, sig ?? '', body.scanSessionToken);
  }
}
