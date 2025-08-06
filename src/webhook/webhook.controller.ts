import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  @Post('new-subscription')
  async handleNewSubscription(
    @Headers('trbt-signature') signature: string,
    @Body() body: any,
  ): Promise<{ ok: boolean }> {
    console.log(signature, body);
    return { ok: true };
  }
}
