import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Address } from '@prisma/client';
import { CartService } from 'src/cart/cart.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderItems, UserCart } from 'src/types';
import { AddressDto } from 'src/user/dto/address.dto';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private cart: CartService,
  ) {}
  async placeOrder(userId: string, addressDto: AddressDto) {
    try {
      const cart: UserCart | null = await this.cart.getCartDetails(userId);
      if (cart) {
        if (cart?.cartItems?.length === 0) {
          throw new BadRequestException('Your cart is empty');
        }
        // create address for the user or use user existing address
        let address: Address;

        if (addressDto?.addressId) {
          address = (await this.prisma.address.findUnique({
            where: {
              id: addressDto?.addressId,
              userId,
            },
          })) as Address;
        } else if (
          addressDto?.city &&
          addressDto?.country &&
          addressDto?.state &&
          addressDto?.street &&
          addressDto?.zipCode
        ) {
          address = await this.prisma.address.create({
            data: {
              userId: userId,
              street: addressDto.street,
              city: addressDto.city,
              state: addressDto.state,
              zipCode: addressDto.zipCode,
              country: addressDto.country,
            },
          });
        } else {
          return new BadRequestException('Address is missing required fields');
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
            addressId: address?.id,
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

  async getOrderHistory(userId: string) {
    try {
      return this.prisma.order.findMany({
        where: { userId },
        include: {
          orderItems: true,
        },
      });
    } catch (err) {
      throw new BadRequestException(err);
    }
  }
}
