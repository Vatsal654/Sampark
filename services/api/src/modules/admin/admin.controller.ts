/**
 * Purpose: HTTP surface for the admin console's operational features.
 * Security: Every route requires AdminAuthGuard (a valid admin session)
 * AND PermissionsGuard (the admin's role holds the declared permission) —
 * see rbac/permissions.ts for the actual role matrix.
 * Related: admin.service.ts.
 */
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { issueTagRequestSchema, updateFeatureFlagSchema, breakGlassRequestSchema, type IssueTagRequest, type UpdateFeatureFlag, type BreakGlassRequest } from '@sampark/api-contracts';
import type { FeatureFlagKey } from '@sampark/shared-config';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import { AdminService } from './admin.service';

const suspendTagSchema = z.object({ reason: z.string().min(10).max(280) });
const blockIdentitySchema = z.object({
  identityType: z.enum(['phone', 'device_fingerprint', 'ip_range']),
  identity: z.string().min(1),
  reason: z.string().min(10).max(280),
});

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, PermissionsGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @RequirePermission('tags.view')
  @Get('tags')
  listTags() {
    return this.adminService.listTags();
  }

  @RequirePermission('tags.issue')
  @Post('tags/issue')
  issueTags(@CurrentAdmin() admin: { id: string }, @Body(new ZodValidationPipe(issueTagRequestSchema)) body: IssueTagRequest) {
    return this.adminService.issueTags(admin.id, body.batchReference, body.quantity);
  }

  @RequirePermission('tags.suspend')
  @Post('tags/:id/suspend')
  suspendTag(@CurrentAdmin() admin: { id: string }, @Param('id') id: string, @Body(new ZodValidationPipe(suspendTagSchema)) body: { reason: string }) {
    return this.adminService.suspendTag(admin.id, id, body.reason);
  }

  @RequirePermission('alerts.view')
  @Get('alerts')
  listAlerts() {
    return this.adminService.listAlerts();
  }

  @RequirePermission('calls.view')
  @Get('calls')
  listCalls() {
    return this.adminService.listCalls();
  }

  @RequirePermission('abuse.view')
  @Get('abuse-reports')
  listAbuseReports() {
    return this.adminService.listAbuseReports();
  }

  @RequirePermission('abuse.block')
  @Post('block-list')
  blockIdentity(@CurrentAdmin() admin: { id: string }, @Body(new ZodValidationPipe(blockIdentitySchema)) body: z.infer<typeof blockIdentitySchema>) {
    return this.adminService.blockIdentity(admin.id, body.identityType, body.identity, body.reason);
  }

  @RequirePermission('feature_flags.view')
  @Get('feature-flags')
  listFeatureFlags() {
    return this.adminService.listFeatureFlags();
  }

  @RequirePermission('feature_flags.update')
  @Post('feature-flags/:key')
  updateFeatureFlag(
    @CurrentAdmin() admin: { id: string },
    @Param('key') key: string,
    @Body(new ZodValidationPipe(updateFeatureFlagSchema)) body: UpdateFeatureFlag,
  ) {
    return this.adminService.updateFeatureFlag(admin.id, key as FeatureFlagKey, body.enabled, body.reason);
  }

  @RequirePermission('audit.view')
  @Get('audit-events')
  listAuditEvents() {
    return this.adminService.listAuditEvents();
  }

  @RequirePermission('break_glass.request')
  @Post('break-glass/request')
  requestBreakGlass(@CurrentAdmin() admin: { id: string }, @Body(new ZodValidationPipe(breakGlassRequestSchema)) body: BreakGlassRequest) {
    return this.adminService.requestBreakGlass(admin.id, body.targetType, body.targetId, body.reason);
  }

  @RequirePermission('break_glass.approve')
  @Post('break-glass/:id/approve')
  approveBreakGlass(@CurrentAdmin() admin: { id: string }, @Param('id') id: string) {
    return this.adminService.approveBreakGlass(admin.id, id);
  }

  @RequirePermission('support_tickets.view')
  @Get('support-tickets')
  listSupportTickets() {
    return this.adminService.listSupportTickets();
  }
}
