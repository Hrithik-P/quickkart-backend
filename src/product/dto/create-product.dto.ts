import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  stock: number;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images: string[];
}
