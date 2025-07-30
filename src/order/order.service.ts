import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CartService } from 'src/cart/cart.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderItems, UserCart } from 'src/types';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private cart: CartService,
  ) {}
  async placeOrder(userId: string) {
    try {
      const cart: UserCart | null = await this.cart.getCartDetails(userId);
      if (cart) {
        if (cart?.cartItems?.length === 0) {
          throw new BadRequestException('Your cart is empty');
        }
        // create a orderItem array from the cartItems
        const orderItems: OrderItems[] = [];
        let total: number = 0;
        for (const item of cart.cartItems) {
          orderItems.push({
            productId: item?.product?.id,
            price: item?.product?.price,
            quantity: item?.quantity,
          });
          total += Number(item.product.price) * item?.quantity;
        }
        // create a order with orderItems and total
        const order = this.prisma.order.create({
          data: {
            userId,
            orderNumber: `ORD-${Date.now()}`,
            status: 'pending',
            total,
            orderItems: {
              createMany: {
                data: orderItems,
              },
            },
          },
          omit: {
            userId: true,
          },
        });

        // update the product stock decreasing the quantity
        for (const orderItem of orderItems) {
          await this.prisma.product.update({
            where: {
              id: orderItem.productId,
            },
            data: {
              stock: {
                decrement: orderItem?.quantity,
              },
            },
          });
        }

        await this.prisma.cartItem.deleteMany({
          where: {
            cartId: cart?.id,
          },
        });

        return order;
      }
    } catch (err) {
      throw new NotFoundException(err);
    }
  }
}
