import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SupportTicketEntity } from '../../database/entities';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicketEntity]), JwtModule.register({})],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
