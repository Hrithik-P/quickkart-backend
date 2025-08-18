import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { CartService } from 'src/cart/cart.service';
import { StripeService } from 'src/stripe/stripe.service';

@Module({
  controllers: [OrderController],
  providers: [OrderService, CartService, StripeService],
})
export class OrderModule {}
