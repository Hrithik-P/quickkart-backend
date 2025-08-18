import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('STRIPE_SECRET_KEY') || '';
    this.stripe = new Stripe(key);
  }

  async createPaymentIntent(createPaymentDto: CreatePaymentIntentDto) {
    const { amount, orderId, userId } = createPaymentDto;
    return this.stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        orderId,
        userId,
      },
    });
  }
}
