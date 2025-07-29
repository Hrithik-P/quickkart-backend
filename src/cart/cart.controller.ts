import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}
  @Post()
  addToCart(@Body() addToCart: AddToCartDto, @Param('userId') userId: string) {
    return this.cartService.addProductToCart(userId, addToCart);
  }

  @Delete(':productId')
  removeFromCart(@Body() productId: string, @Param('userId') userId: string) {
    return this.cartService.removeProductFromCart(userId, productId);
  }
}
