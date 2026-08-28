import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminAuthService } from './admin-auth.service';

const adminLoginSchema = z.object({
  email: z.string().email(),
  mfaCode: z.string().regex(/^\d{6}$/),
});
type AdminLogin = z.infer<typeof adminLoginSchema>;

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  login(@Body(new ZodValidationPipe(adminLoginSchema)) body: AdminLogin) {
    return this.adminAuthService.login(body.email, body.mfaCode);
  }
}
