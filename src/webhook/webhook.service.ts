import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
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
}
