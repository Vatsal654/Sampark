/**
 * Purpose: HTTP surface for owner authentication.
 * Responsibilities: OTP request/verify, refresh, logout, logout-all,
 * session listing.
 * Security: `/auth/otp/request` and `/auth/otp/verify` are intentionally
 * unauthenticated (that's the point of OTP login) but validated and
 * rate-limited; every other route requires JwtAuthGuard.
 * Related: auth.service.ts, packages/api-contracts/src/auth.ts.
 */
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  requestOtpSchema,
  verifyOtpSchema,
  refreshTokenRequestSchema,
  type RequestOtp,
  type VerifyOtp,
  type RefreshTokenRequest,
} from '@sampark/api-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { CurrentSessionId } from '../../common/decorators/current-session-id.decorator';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  requestOtp(@Body(new ZodValidationPipe(requestOtpSchema)) body: RequestOtp) {
    return this.authService.requestOtp(body.phoneE164);
  }

  @Post('otp/verify')
  verifyOtp(@Body(new ZodValidationPipe(verifyOtpSchema)) body: VerifyOtp) {
    return this.authService.verifyOtp(body.phoneE164, body.code, body.deviceName);
  }

  @Post('refresh')
  refresh(@Body(new ZodValidationPipe(refreshTokenRequestSchema)) body: RefreshTokenRequest) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  async logout(@Body(new ZodValidationPipe(refreshTokenRequestSchema)) body: RefreshTokenRequest) {
    await this.authService.logout(body.refreshToken);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@CurrentUserId() userId: string) {
    await this.authService.logoutAll(userId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  listSessions(@CurrentUserId() userId: string, @CurrentSessionId() sessionId: string) {
    return this.authService.listSessions(userId, sessionId);
  }
}
