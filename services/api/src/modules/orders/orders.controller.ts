import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createOrderSchema, type CreateOrder } from '@sampark/api-contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';

@ApiTags('owner-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('owner/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrder) {
    return this.ordersService.create(userId, body.quantity);
  }

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.ordersService.list(userId);
  }
}
