import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CustomerModule } from './customer/customer.module';
import { InvoiceModule } from './invoice/invoice.module';
import { PrismaModule } from './prisma/prisma.module';
import { RemnawaveModule } from './remnawave/remnawave.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { TariffModule } from './tariff/tariff.module';
import { TelegramModule } from './telegram/telegram.module';
import { WebhookModule } from './webhook/webhook.module';
import { ActivityLogModule } from './activity-log/activity-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
    ActivityLogModule,
  ],
})
export class AppModule {}
