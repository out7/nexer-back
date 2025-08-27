import {
  SUBSCRIPTION_PERIODS,
  TRBT_TO_LOCAL_PERIOD,
} from '@/common/constants/subscription.constants';
import { CustomerService } from '@/customer/customer.service';
import { PaymentService } from '@/payment/payment.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { TelegramService } from '@/telegram/telegram.service';
import { TrbtWebhookDto } from '@/webhook/dto/trbt-webhook.dto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentService: PaymentService,
    private readonly customerService: CustomerService,
    private readonly telegramService: TelegramService,
  ) {}

  verifyTrbtSignature(signature: string, body: any): boolean {
    const payload = JSON.stringify(body);
    const hmac = crypto.createHmac(
      'sha256',
      this.configService.getOrThrow<string>('TRBT_API_KEY'),
    );
    const digest = hmac.update(payload).digest('hex');
    this.logger.debug(`[TRBT] Signature: ${digest} | ${signature}`);
    return digest === signature;
  }

  async processTrbtNewSubscription(body: TrbtWebhookDto) {
    const { payload } = body;

    this.logger.debug(`[TRBT] New purchase: ${JSON.stringify(payload)}`);

    const customer = await this.customerService.findOneByTelegramId(
      payload.telegram_user_id.toString(),
    );
    if (!customer) {
      this.logger.warn('[TELEGRAM] Customer not found');
      return;
    }

    await this.paymentService.create({
      customer,
      amount: payload.amount,
      currency: 'rub',
      method: 'trbt',
    });

    this.subscriptionService.upsertUserSubscription({
      telegramId: payload.telegram_user_id.toString(),
      period: TRBT_TO_LOCAL_PERIOD[payload.period],
      createdVia: 'paid',
    });

    const days = SUBSCRIPTION_PERIODS[TRBT_TO_LOCAL_PERIOD[payload.period]];

    await this.telegramService.sendMessage(
      payload.telegram_user_id.toString(),
      `🎉 Оплата прошла успешно!\nВы получили премиум на ${days} дней. 🔥\nСпасибо, что выбираете нас 💙`,
    );
  }

  async processTrbtCancelledSubscription(body: TrbtWebhookDto) {
    const { payload } = body;
    this.logger.debug(`[TRBT] Cancelled purchase: ${JSON.stringify(payload)}`);
  }
}
