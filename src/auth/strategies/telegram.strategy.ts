import { BadRequestException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-custom';

import { AuthService } from '../auth.service';

@Injectable()
export class TelegramStrategy extends PassportStrategy(Strategy, 'telegram') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(req: Request) {
    const authData = req.body?.data;

    if (!authData) {
      throw new BadRequestException('Telegram initData is missing');
    }

    // const isValidData = this.authService.validateTelegramData(authData);
    // if (!isValidData) {
    //   throw new UnauthorizedException('Invalid Telegram initData');
    // }

    return { isValid: true };
  }
}
