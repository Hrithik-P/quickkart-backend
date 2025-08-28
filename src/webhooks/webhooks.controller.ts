import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { StripeService } from 'src/stripe/stripe.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import Stripe from 'stripe';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private stripeService: StripeService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request & { rawBody: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    const rawBody = req.rawBody;
    if (!rawBody || !signature || !webhookSecret) {
      // invalid request
      return { received: true };
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      // signature verification failed
      console.error('Webhook signature verification failed.', err);
      return { received: false };
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      await this.finalizeOrder(pi);
    }
  }

  private async finalizeOrder(pi: Stripe.PaymentIntent) {
    const { orderId } = pi.metadata;

    const payment = await this.prisma.payment.findUnique({
      where: { paymentIntentId: pi.id },
    });

    if (!payment || payment.status === 'succeeded') {
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      return;
    }

    // recheck product stock and update payment

    for (const item of order.orderItems) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product || product.stock < item.quantity) {
        await this.stripeService.refundPayment(pi.id, Number(item.price));
        await this.prisma.payment.update({
          where: { paymentIntentId: pi.id },
          data: { status: 'refunded' },
        });
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: 'failed_stock' },
        });
        return;
      }
    }

    // update product stock and payment status
    // do it in a transaction
    // so if any of the operation fails, none of them will be applied
    await this.prisma.$transaction([
      ...order.orderItems.map((item) => {
        return this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }),
      this.prisma.payment.update({
        where: { paymentIntentId: pi.id },
        data: { status: 'succeeded' },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'paid' },
      }),
      this.prisma.cartItem.deleteMany({
        where: { cart: { userId: order.userId } },
      }),
    ]);
  }
}
