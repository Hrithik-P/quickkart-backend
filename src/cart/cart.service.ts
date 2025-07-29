import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}
  async addProductToCart(userId: string, addToCartDto: AddToCartDto) {
    // find if user already has a cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { cartItems: true },
    });

    if (!cart) {
      // if not create a new cart
      return this.prisma.cart.create({
        data: {
          userId,
          cartItems: {
            create: {
              productId: addToCartDto.productId,
              quantity: addToCartDto.quantity,
            },
          },
        },
      });
    }
    // check if addToCart Obj has a new product or not
    const existingCartItem = cart.cartItems.find(
      (item) => item.productId === addToCartDto.productId,
    );

    if (existingCartItem) {
      // update existing product with latest data
      return this.prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: addToCartDto.quantity },
      });
    } else {
      // create new cartItem for the product
      return this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: addToCartDto.productId,
          quantity: addToCartDto.quantity,
        },
      });
    }
  }
  async removeProductFromCart(userId: string, productId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        userId,
      },
    });
    if (cart) {
      const cartItem = await this.prisma.cartItem.findFirst({
        where: {
          cartId: cart?.id,
          productId: productId,
        },
      });

      if (cartItem) {
        return this.prisma.cartItem.delete({
          where: {
            id: cartItem?.id,
          },
        });
      } else {
        throw new NotFoundException('Cart Do not has product with given ID');
      }
    } else {
      throw new NotFoundException('User has No Product in Cart');
    }
  }

  // getUserCart() {
  //   const cart = this.prisma.cart.findUnique({
  //     where: {
  //       userId,
  //     },
  //   });
  // }
}
