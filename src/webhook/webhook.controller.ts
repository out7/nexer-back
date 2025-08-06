import { WebhookService } from '@/webhook/webhook.service';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('new-subscription')
  @HttpCode(200)
  async handleNewSubscription(
    @Headers('trbt-signature') signature: string,
    @Body() body: any,
  ): Promise<{ status: string }> {
    console.log(signature, body);
    const isValid = this.webhookService.verifyTrbtSignature(signature, body);
    console.log('isValid', isValid);
    if (!isValid) throw new UnauthorizedException('Invalid signature');
    return { status: 'ok' };
  }
}
// http://localhost:4444/api/v1.0/webhook/new-subscription
// https://miniapp.awbait.com/api/v1.0/webhook/new-subscription
