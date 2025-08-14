import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { RemoveFromCartDto } from './dto/remove-from-cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}
  async addProductToCart(addToCartDto: AddToCartDto) {
    // find if user already has a cart
    try {
      const { userId } = addToCartDto;
      if (addToCartDto) {
        const cart = await this.prisma.cart.findUnique({
          where: { userId },
          include: { cartItems: true },
        });

        if (!cart) {
          // if not create a new cart
          await this.prisma.cart.create({
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
          return 'Product Add to Cart Successfully';
        }
        // check if addToCart Obj has a new product or not
        const existingCartItem = cart.cartItems.find(
          (item) => item.productId === addToCartDto.productId,
        );

        if (existingCartItem) {
          // update existing product with latest data
          await this.prisma.cartItem.update({
            where: { id: existingCartItem.id },
            data: { quantity: addToCartDto.quantity },
          });
          return 'Product in cart is updated';
        } else {
          // create new cartItem for the product
          await this.prisma.cartItem.create({
            data: {
              cartId: cart.id,
              productId: addToCartDto.productId,
              quantity: addToCartDto.quantity,
            },
          });
          return 'New Product added to the cart';
        }
      } else {
        throw new NotFoundException('Can not add to cart insufficient data');
      }
    } catch (err) {
      throw new NotFoundException(err);
    }
  }
  async removeProductFromCart(removeFromCartDto: RemoveFromCartDto) {
    const { productId, userId, quantity } = removeFromCartDto;
    try {
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

        if (cartItem?.quantity && cartItem?.quantity > 1 && quantity) {
          await this.prisma.cartItem.update({
            where: {
              id: cartItem?.id,
            },
            data: {
              quantity,
            },
          });
          return 'Updated Successfully';
        } else {
          return this.prisma.cartItem.delete({
            where: {
              id: cartItem?.id,
            },
          });
        }
      } else {
        throw new NotFoundException('User has No Product in Cart');
      }
    } catch (err) {
      throw new NotFoundException(err);
    }
  }

  async getCartDetails(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        cartItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true,
                stock: true,
              },
            },
          },
          omit: {
            cartId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      omit: {
        createdAt: true,
        updatedAt: true,
      },
    });

    return cart ?? null;
  }
}
