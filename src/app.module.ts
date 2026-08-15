import { ActivityLogModule } from '@/activity-log/activity-log.module';
import { AuthModule } from '@/auth/auth.module';
import { CustomerModule } from '@/customer/customer.module';
import { InvoiceModule } from '@/invoice/invoice.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RemnawaveModule } from '@/remnawave/remnawave.module';
import { SubscriptionExpirerModule } from '@/subscription/subscription-expirer.module';
import { SubscriptionModule } from '@/subscription/subscription.module';
import { TariffModule } from '@/tariff/tariff.module';
import { TelegramModule } from '@/telegram/telegram.module';
import { WebhookModule } from '@/webhook/webhook.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReferralModule } from './referral/referral.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // ENV_FILE позволяет поднять локальный стенд, не перетирая боевой .env
      // (см. test/README.md). Без переменной поведение прежнее — читается .env.
      ...(process.env.ENV_FILE ? { envFilePath: process.env.ENV_FILE } : {}),
    }),
    PrismaModule,
    AuthModule,
    CustomerModule,
    RemnawaveModule,
    TariffModule,
    TelegramModule,
    InvoiceModule,
    WebhookModule,
    SubscriptionModule,
    SubscriptionExpirerModule,
    ActivityLogModule,
    ReferralModule,
    PaymentModule,
  ],
})
export class AppModule {}
