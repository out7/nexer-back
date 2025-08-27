import { CustomerModule } from '@/customer/customer.module';
import { PaymentModule } from '@/payment/payment.module';
import { SubscriptionModule } from '@/subscription/subscription.module';
import { TelegramModule } from '@/telegram/telegram.module';
import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [SubscriptionModule, PaymentModule, CustomerModule, TelegramModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
