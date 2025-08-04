import { RefreshStrategy } from '@/auth/strategies/refresh-token.strategy';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CustomerModule } from '../customer/customer.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { getJwtConfig } from './config/jwt.config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TelegramStrategy } from './strategies/telegram.strategy';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
    CustomerModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TelegramStrategy, JwtStrategy, RefreshStrategy],
})
export class AuthModule {}
