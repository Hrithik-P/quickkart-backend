// src/auth/guards/roles.guard.ts

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface JwtPayload {
  sub: number;
  username: string;
  role: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    if (!requiredRoles) {
      return true; // If no roles required, allow access
    }

    const request: Request = context.switchToHttp().getRequest();
    const token = request.headers['authorization']?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }

    try {
      const decoded = this.jwtService.verify<JwtPayload>(token);
      const { role } = decoded; // Extract the role from the token payload

      if (requiredRoles.includes(role)) {
        return true; // If the user has a required role, allow access
      } else {
        throw new ForbiddenException('Insufficient permissions');
      }
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
