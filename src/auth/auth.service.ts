import { ConflictException, Injectable } from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}
  private generateToken(payload: { sub: string; role: string }) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in the environment');
    }
    return jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
  }
  async signup(dto: SignupDto) {
    const { email, password, name } = dto;
    // check if user already exist
    const isExitingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (isExitingUser) {
      throw new ConflictException('User already exists');
    }

    // hash password

    const hash = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    // check if user already exist

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      throw new ConflictException('User does not exist');
    }

    // compare password
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      throw new ConflictException('Password does not match');
    }

    const payload = {
      sub: user?.id,
      role: user?.role,
    };

    const token = this.generateToken(payload);

    return {
      token,
    };
  }
}
