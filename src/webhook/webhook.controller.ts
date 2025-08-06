import { WebhookService } from '@/webhook/webhook.service';
import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('new-subscription')
  async handleNewSubscription(
    @Headers('trbt-signature') signature: string,
    @Body() body: any,
  ): Promise<{ status: string }> {
    console.log(signature, body);
    const isValid = this.webhookService.verifyTrbtSignature(signature, body);
    if (!isValid) throw new UnauthorizedException('Invalid signature');
    return { status: 'ok' };
  }
}
