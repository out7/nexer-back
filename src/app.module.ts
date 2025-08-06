import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CustomerModule } from './customer/customer.module';
import { PrismaModule } from './prisma/prisma.module';
import { RemnawaveModule } from './remnawave/remnawave.module';
import { TariffModule } from './tariff/tariff.module';
import { TelegramModule } from './telegram/telegram.module';
import { InvoiceModule } from './invoice/invoice.module';
import { WebhookModule } from './webhook/webhook.module';

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
  ],
})
export class AppModule {}
