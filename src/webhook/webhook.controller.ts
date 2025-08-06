import { WebhookResponseDto } from '@/webhook/dto/webhook-response.dto';
import { WebhookService } from '@/webhook/webhook.service';
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('trbt')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive new subscription webhook from TRBT' })
  @ApiResponse({
    status: 200,
    description: 'Webhook successfully processed',
    type: WebhookResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid signature' })
  @ApiBadRequestResponse({ description: 'Empty or invalid body' })
  async handleNewSubscription(
    @Headers('trbt-signature') signature: string,
    @Body() body: any,
  ): Promise<WebhookResponseDto> {
    if (!signature) {
      throw new UnauthorizedException('Missing trbt-signature header');
    }
    if (!body || Object.keys(body).length === 0) {
      throw new BadRequestException('Empty or missing body in webhook request');
    }

    const isValid = this.webhookService.verifyTrbtSignature(signature, body);
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    switch (body.name) {
      case 'new_subscription':
        await this.webhookService.processTrbtNewSubscription(body);
        break;
      case 'cancelled_subscription':
        await this.webhookService.processTrbtCancelledSubscription(body);
        break;
      default:
        this.logger.error('Unknown webhook event type', body);
        throw new BadRequestException('Unknown webhook event type');
    }

    return { status: 'ok' };
  }
}
