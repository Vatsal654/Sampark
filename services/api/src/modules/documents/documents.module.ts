import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { DocumentEntity, DocumentAccessGrantEntity } from '../../database/entities';
import { AuditModule } from '../../common/audit/audit.module';
import { StorageService } from './storage.service';
import { VIRUS_SCAN_PROVIDER } from './virus-scan.interface';
import { MockVirusScanProvider } from './mock-virus-scan.provider';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, DocumentAccessGrantEntity]), JwtModule.register({}), AuditModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService, { provide: VIRUS_SCAN_PROVIDER, useClass: MockVirusScanProvider }],
})
export class DocumentsModule {}
