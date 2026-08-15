import { CustomerModule } from '@/customer/customer.module';
import { PaymentModule } from '@/payment/payment.module';
import { ReferralModule } from '@/referral/referral.module';
import { SubscriptionModule } from '@/subscription/subscription.module';
import { TariffModule } from '@/tariff/tariff.module';
import { TelegramUpdate } from '@/telegram/telegram.update';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { HttpModule } from '@nestjs/axios';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        token: configService.getOrThrow('TELEGRAM_TOKEN'),
        options: {
          telegram: {
            testEnv: configService.getOrThrow('TELEGRAM_TEST_ENV') === 'true',
          },
        },
        // Локальный стенд без боевого токена: без этого Telegraf валится на
        // getMe (401) и убивает весь процесс уже ПОСЛЕ успешного старта Nest —
        // вместе с вебхуком оплат и Mini App. По умолчанию поведение прежнее.
        ...(configService.get('TELEGRAM_DISABLE_BOT') === 'true'
          ? { launchOptions: false as const }
          : {}),
      }),
      inject: [ConfigService],
    }),
    SubscriptionModule,
    CustomerModule,
    ReferralModule,
    PaymentModule,
    TariffModule,
    HttpModule,
  ],
  providers: [TelegramService, TelegramUpdate],
  exports: [TelegramService],
})
export class TelegramModule {}
