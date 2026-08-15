import { TrbtWebhookDto } from '@/webhook/dto/trbt-webhook.dto';
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
  Req,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

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
    @Req() req: RawBodyRequest<Request>,
    // Типизированный DTO вместо `any`: без него глобальный ValidationPipe
    // не срабатывал и в обработчик попадало что угодно.
    //
    // Пайп локальный и намеренно мягче глобального: forbidNonWhitelisted
    // отверг бы вебхук целиком, стоит Tribute добавить в payload новое поле.
    // Проверяем то, чем пользуемся, остальное пропускаем как есть.
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: false,
        forbidNonWhitelisted: false,
      }),
    )
    body: TrbtWebhookDto,
  ): Promise<WebhookResponseDto> {
    if (!signature) {
      throw new UnauthorizedException('Missing trbt-signature header');
    }

    // Подпись — от сырых байт, до всякого парсинга.
    if (!this.webhookService.verifyTrbtSignature(signature, req.rawBody)) {
      throw new UnauthorizedException('Invalid signature');
    }

    this.logger.debug(
      `[TRBT] Webhook accepted: ${body.name} subscription=${body.payload?.subscription_id}`,
    );

    switch (body.name) {
      case 'new_subscription':
        await this.webhookService.processTrbtNewSubscription(body);
        break;
      case 'cancelled_subscription':
        await this.webhookService.processTrbtCancelledSubscription(body);
        break;
      default:
        this.logger.error(`[TRBT] Unknown webhook event type: ${body.name}`);
        throw new BadRequestException('Unknown webhook event type');
    }

    return { status: 'ok' };
  }
}
