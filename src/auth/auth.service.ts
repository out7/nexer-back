import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { isValid, parse } from '@telegram-apps/init-data-node';
import { CustomerService } from '../customer/customer.service';
import { AuthDataDto } from './dto/auth-data.dto';
import { AuthJwtPayload } from './types/auth-jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly customerService: CustomerService,
  ) {}

  async authUser(authDataDto: AuthDataDto) {
    const initData = parse(authDataDto.data);
    const customer = await this.customerService.findOrCreate(initData);

    if (!customer) {
      throw new InternalServerErrorException(
        'Failed to find or create customer',
      );
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      customer.telegramId.toString(),
    );
    // const hashedRT = await hash(refreshToken);

    // await this.customerService.updateHashedRefreshToken(
    //   customer.telegramId,
    //   hashedRT,
    // );

    return {
      telegramId: customer.telegramId,
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  validateTelegramData(data: string): boolean {
    return isValid(
      data,
      this.configService.getOrThrow<string>('TELEGRAM_TOKEN'),
      {
        expiresIn: this.configService.getOrThrow<number>(
          'TELEGRAM_INIT_DATA_EXPIRES_IN',
        ),
      },
    );
  }

  private async generateTokens(tgId: string) {
    const payload: AuthJwtPayload = { sub: tgId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateJwtUser(telegramId: string) {
    const customer = await this.customerService.findOneByTelegramId(telegramId);
    if (!customer) throw new UnauthorizedException('Customer not found!');
    const currentUser = { telegramId: customer.telegramId };
    return currentUser;
  }
}
