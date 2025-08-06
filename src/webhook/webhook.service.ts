import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly configService: ConfigService) {}

  verifyTrbtSignature(signature: string, body: any): boolean {
    const payload = JSON.stringify(body);
    const hmac = crypto.createHmac(
      'sha256',
      this.configService.getOrThrow<string>('TRBT_API_KEY'),
    );
    const digest = hmac.update(payload).digest('hex');
    return digest === signature;
  }

  async processTrbtNewSubscription(body: any) {
    this.logger.log('processTrbtNewSubscription', body);
    // здесь логика для новой подписки
    // body.payload - это все нужные данные
  }

  async processTrbtCancelledSubscription(body: any) {
    this.logger.log('processTrbtCancelledSubscription', body);
    // логика отмены подписки
    // body.payload - содержит те же поля плюс cancel_reason
  }
}
