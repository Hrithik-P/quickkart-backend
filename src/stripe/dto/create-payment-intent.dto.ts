import { IsNumber, IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsNumber()
  amount: number;

  @IsString()
  orderId: string;

  @IsString()
  userId: string;
}
