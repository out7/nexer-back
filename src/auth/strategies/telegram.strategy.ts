import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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

    // Без этой проверки initData — просто строка от клиента: любой мог
    // подставить чужой telegram id и получить токены на чужой аккаунт.
    if (!this.authService.validateTelegramData(authData)) {
      throw new UnauthorizedException('Invalid Telegram initData');
    }

    return { isValid: true };
  }
}
