/**
 * Purpose: HTTP surface for owner vehicle management.
 * Security: Every route requires JwtAuthGuard; ownership is enforced
 * inside VehiclesService using the authenticated userId, never a
 * client-supplied one.
 * Related: vehicles.service.ts, packages/api-contracts/src/vehicle.ts.
 */
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createVehicleSchema, updateVehicleSchema, type CreateVehicle, type UpdateVehicle } from '@sampark/api-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { VehiclesService } from './vehicles.service';

@ApiTags('owner-vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('owner/vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(@CurrentUserId() ownerId: string, @Body(new ZodValidationPipe(createVehicleSchema)) body: CreateVehicle) {
    return this.vehiclesService.create(ownerId, body);
  }

  @Get()
  list(@CurrentUserId() ownerId: string) {
    return this.vehiclesService.list(ownerId);
  }

  @Get(':id')
  getOne(@CurrentUserId() ownerId: string, @Param('id') id: string) {
    return this.vehiclesService.getOne(ownerId, id);
  }

  @Patch(':id')
  update(
    @CurrentUserId() ownerId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateVehicleSchema)) body: UpdateVehicle,
  ) {
    return this.vehiclesService.update(ownerId, id, body);
  }

  @Delete(':id')
  async remove(@CurrentUserId() ownerId: string, @Param('id') id: string) {
    await this.vehiclesService.remove(ownerId, id);
    return { success: true };
  }
}
