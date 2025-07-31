// src/order/dto/address.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AddressDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  state: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  zipCode: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  country: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  addressId: string;
}
