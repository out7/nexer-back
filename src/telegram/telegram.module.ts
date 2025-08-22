import { CustomerModule } from '@/customer/customer.module';
import { PaymentModule } from '@/payment/payment.module';
import { ReferralModule } from '@/referral/referral.module';
import { SubscriptionModule } from '@/subscription/subscription.module';
import { TelegramUpdate } from '@/telegram/telegram.update';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
      }),
      inject: [ConfigService],
    }),
    SubscriptionModule,
    CustomerModule,
    ReferralModule,
    PaymentModule,
  ],
  providers: [TelegramService, TelegramUpdate],
  exports: [TelegramService],
})
export class TelegramModule {}
