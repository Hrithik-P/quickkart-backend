import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address } from '@prisma/client';
import { CartService } from 'src/cart/cart.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderItems } from 'src/types';
import { AddressDto } from 'src/user/dto/address.dto';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private cart: CartService,
    private config: ConfigService,
  ) {}
  async placeOrder(userId: string, addressDto: AddressDto) {
    // verify the user cart is not empty
    const cart = await this.cart.getCartDetails(userId);
    if (!cart || cart?.cartItems?.length === 0) {
      throw new BadRequestException('Your Cart is Empty');
    }

    if (cart?.cartItems?.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    // create a orderItem array from the cartItems
    const orderItems: OrderItems[] = [];
    let total = 0;
    for (const item of cart.cartItems) {
      if (!item?.product) {
        throw new BadRequestException('Invalid Product');
      }
      if (item?.product?.stock < item?.quantity) {
        throw new BadRequestException(
          `Not enough stock for ${item.product.name}`,
        );
      }
      orderItems.push({
        productId: item?.product?.id,
        price: item?.product?.price,
        quantity: item?.quantity,
      });
      total += Number(item.product.price) * Number(item?.quantity);
    }

    // Address handling with ownership check
    let address: Address;
    if (addressDto?.addressId) {
      address = (await this.prisma.address.findUnique({
        where: {
          id: addressDto?.addressId,
          userId,
        },
      })) as Address;
      if (!address) throw new BadRequestException('Address not found');
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
          ...addressDto,
        },
      });
    } else {
      return new BadRequestException('Address is missing required fields');
    }

    // create a pending order in transaction (no stock update yet)
    const currency = this.config.get<string>('STRIPE_CURRENCY') || 'inr';
    const amountInMinorUnits = Math.round(total * 100);
    const order = await this.prisma.order.create({
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
    });

    // create paymentIntent with idempotency

    const paymentIntent = await this.stripService.createPaymentIntent(
      amountInMinorUnits,
      currency,
      { orderId: order.id, userId },
      `order-${order.id}`,
    );

    // store payment records
    await this.prisma.payment.create({
      data{
        orderId: order.id,
        stripPaymentIntentId: paymentIntent.id,
        amount: amountInMinorUnits,
        currency,
        status: paymentIntent.status,
      },
    });

    return {
      clientSecret: paymentIntent.status,
      orderId: order.id,
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
