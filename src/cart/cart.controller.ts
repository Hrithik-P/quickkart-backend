import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { RemoveFromCartDto } from './dto/remove-from-cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}
  @Post()
  addToCart(@Body() addToCart: AddToCartDto) {
    return this.cartService.addProductToCart(addToCart);
  }

  @Delete()
  removeFromCart(@Body() removeFromCart: RemoveFromCartDto) {
    return this.cartService.removeProductFromCart(removeFromCart);
  }

  @Get()
  getUserCart(@Body('userId') userId: string) {
    return this.cartService.getCartDetails(userId);
  }
}
