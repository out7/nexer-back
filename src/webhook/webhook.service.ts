import { TRBT_TO_LOCAL_PERIOD } from '@/common/constants/subscription.constants';
import { SubscriptionService } from '@/subscription/subscription.service';
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
  ) {}

  verifyTrbtSignature(signature: string, body: any): boolean {
    const payload = JSON.stringify(body);
    const hmac = crypto.createHmac(
      'sha256',
      this.configService.getOrThrow<string>('TRBT_API_KEY'),
    );
    const digest = hmac.update(payload).digest('hex');
    return digest === signature;
  }

  async processTrbtNewSubscription(body: TrbtWebhookDto) {
    const { payload } = body;

    this.logger.debug(`[TRBT] New purchase: ${JSON.stringify(payload)}`);

    this.subscriptionService.upsertUserSubscription({
      telegramId: payload.telegram_user_id.toString(),
      period: TRBT_TO_LOCAL_PERIOD[payload.period],
      createdVia: 'paid',
    });
  }

  async processTrbtCancelledSubscription(body: TrbtWebhookDto) {
    const { payload } = body;
    this.logger.debug(`[TRBT] Cancelled purchase: ${JSON.stringify(payload)}`);
  }
}
