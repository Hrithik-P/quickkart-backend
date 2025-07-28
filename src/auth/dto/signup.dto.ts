import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  role: 'ADMIN' | 'CUSTOMER';
}
