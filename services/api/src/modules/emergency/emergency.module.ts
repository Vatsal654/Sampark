import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { EmergencyProfileEntity, EmergencyContactEntity, TagEntity } from '../../database/entities';
import { EmergencyService } from './emergency.service';
import { EmergencyController, PublicEmergencyController } from './emergency.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EmergencyProfileEntity, EmergencyContactEntity, TagEntity]), JwtModule.register({})],
  controllers: [EmergencyController, PublicEmergencyController],
  providers: [EmergencyService],
})
export class EmergencyModule {}
