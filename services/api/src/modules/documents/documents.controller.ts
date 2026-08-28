/**
 * Purpose: HTTP surface for the owner document vault.
 * Security: 10MB upload cap enforced by multer options; MIME allowlist
 * enforced in the fileFilter to reject unexpected upload types before
 * they ever reach the virus-scan/storage layer.
 * Related: documents.service.ts.
 */
import { Body, Controller, Delete, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { createDocumentShareSchema, documentUploadMetadataSchema, type CreateDocumentShare, type DocumentUploadMetadata } from '@sampark/api-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

@ApiTags('owner-documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('owner/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => callback(null, ALLOWED_MIME_TYPES.has(file.mimetype)),
    }),
  )
  upload(
    @CurrentUserId() ownerId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(documentUploadMetadataSchema)) metadata: DocumentUploadMetadata,
  ) {
    return this.documentsService.upload(ownerId, metadata, { buffer: file.buffer, mimetype: file.mimetype });
  }

  @Get()
  list(@CurrentUserId() ownerId: string) {
    return this.documentsService.list(ownerId);
  }

  @Delete(':id')
  async remove(@CurrentUserId() ownerId: string, @Param('id') id: string) {
    await this.documentsService.remove(ownerId, id);
    return { success: true };
  }

  @Get(':id/url')
  getUrl(@CurrentUserId() ownerId: string, @Param('id') id: string) {
    return this.documentsService.getSignedUrl(ownerId, id);
  }

  @Post(':id/share')
  createShare(
    @CurrentUserId() ownerId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createDocumentShareSchema)) body: CreateDocumentShare,
  ) {
    return this.documentsService.createShare(ownerId, id, body.ttlMinutes);
  }

  @Delete(':id/share')
  async revokeShares(@CurrentUserId() ownerId: string, @Param('id') id: string) {
    await this.documentsService.revokeAllShares(ownerId, id);
    return { success: true };
  }
}
