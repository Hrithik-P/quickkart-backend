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
      await this.handlePaymentSucceeded(pi);
    }
  }

  private async handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
    const { orderId, userId } = pi.metadata;
    if (!orderId || !userId) {
      throw new Error('Invalid metadata');
    }
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'paid' },
    });
  }
}
