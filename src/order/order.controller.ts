import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { AddressDto } from 'src/user/dto/address.dto';

@Controller('order')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  placeOrder(@Body('userId') userId: string, @Body() addressDto: AddressDto) {
    return this.orderService.placeOrder(userId, addressDto);
  }
}
