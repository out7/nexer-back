import {
  SUBSCRIPTION_PERIODS,
  TRBT_TO_LOCAL_PERIOD,
} from '@/common/constants/subscription.constants';
import { CustomerService } from '@/customer/customer.service';
import { PaymentService } from '@/payment/payment.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { TelegramService } from '@/telegram/telegram.service';
import { TrbtWebhookDto } from '@/webhook/dto/trbt-webhook.dto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, WebhookEvent } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentService: PaymentService,
    private readonly customerService: CustomerService,
    private readonly telegramService: TelegramService,
  ) {}

  /**
   * Подпись считается от СЫРОГО тела запроса, а не от `JSON.stringify` уже
   * распарсенного объекта: пересборка JSON не обязана дать те же байты
   * (пробелы, порядок ключей, \u-эскейпы), и подпись бы разъезжалась.
   * Сырое тело кладёт в req.rawBody настройка rawBody в main.ts.
   */
  verifyTrbtSignature(signature: string, rawBody: Buffer | undefined): boolean {
    if (!rawBody?.length) {
      this.logger.warn('[TRBT] Empty raw body — cannot verify signature');
      return false;
    }

    const digest = crypto
      .createHmac('sha256', this.configService.getOrThrow<string>('TRBT_API_KEY'))
      .update(rawBody)
      .digest('hex');

    // Сравнение постоянного времени: обычный === утекает длину совпавшего
    // префикса и делает подбор подписи возможным.
    const expected = Buffer.from(digest, 'utf8');
    const received = Buffer.from(signature ?? '', 'utf8');

    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(expected, received);
  }

  /**
   * Своего идентификатора события Tribute не присылает, поэтому ключ
   * собирается из полей, которые вместе однозначно определяют факт:
   * подписка + период + пользователь + момент создания события.
   */
  private buildExternalId(body: TrbtWebhookDto): string {
    const p = body.payload;
    return [
      body.name,
      p.subscription_id,
      p.period_id,
      p.telegram_user_id,
      body.created_at,
    ].join(':');
  }

  /**
   * Пытается взять событие в работу.
   *
   * Возвращает запись журнала, если обрабатывать нужно, и null, если событие
   * уже доведено до конца или прямо сейчас обрабатывается параллельной
   * доставкой. Упавшую попытку (`failed`) намеренно ОТДАЁМ на повтор: ретрай
   * провайдера — единственный шанс довести оплату до подписки.
   */
  private async claimEvent(body: TrbtWebhookDto): Promise<WebhookEvent | null> {
    const externalId = this.buildExternalId(body);

    try {
      return await this.prisma.webhookEvent.create({
        data: {
          provider: 'trbt',
          externalId,
          eventName: body.name,
          status: 'processing',
          payload: body as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        e.code !== 'P2002'
      ) {
        throw e;
      }
    }

    // Запись уже есть — решаем по статусу.
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { provider_externalId: { provider: 'trbt', externalId } },
    });

    if (!existing || existing.status === 'completed') {
      this.logger.warn(`[TRBT] Duplicate webhook ignored: ${externalId}`);
      return null;
    }

    if (existing.status === 'processing') {
      this.logger.warn(`[TRBT] Webhook already in progress: ${externalId}`);
      return null;
    }

    // status === 'failed' — возобновляем. Условие в where не даёт двум
    // параллельным ретраям подхватить одно и то же событие.
    const resumed = await this.prisma.webhookEvent.updateMany({
      where: { id: existing.id, status: 'failed' },
      data: { status: 'processing', attempts: { increment: 1 } },
    });

    if (resumed.count === 0) return null;

    this.logger.log(
      `[TRBT] Resuming failed webhook (attempt ${existing.attempts + 1}): ${externalId}`,
    );

    return { ...existing, status: 'processing' };
  }

  private async markCompleted(eventId: string, paymentId?: string) {
    await this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: 'completed', ...(paymentId ? { paymentId } : {}) },
    });
  }

  /**
   * Освобождает событие, чтобы следующий ретрай провайдера его подхватил.
   * Без этого сорвавшаяся выдача превращалась в тихую потерю оплаты.
   */
  private async markFailed(eventId: string, error: unknown, paymentId?: string) {
    await this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: 'failed',
        lastError: (error as Error)?.message?.slice(0, 500) ?? 'unknown',
        ...(paymentId ? { paymentId } : {}),
      },
    });
  }

  async processTrbtNewSubscription(body: TrbtWebhookDto) {
    const { payload } = body;

    const event = await this.claimEvent(body);
    if (!event) return;

    // Платёж, созданный предыдущей неудачной попыткой, не создаём заново.
    let paymentId = event.paymentId ?? undefined;

    try {
      const period = TRBT_TO_LOCAL_PERIOD[payload.period];
      if (!period || !SUBSCRIPTION_PERIODS[period]) {
        throw new BadRequestException(`Unknown TRBT period: ${payload.period}`);
      }

      const customer = await this.customerService.findOneByTelegramId(
        payload.telegram_user_id.toString(),
      );
      if (!customer) {
        // Не ошибка обработки: повторять нечего, клиента просто нет.
        this.logger.warn(
          `[TRBT] Customer not found: tgId=${payload.telegram_user_id}`,
        );
        await this.markCompleted(event.id);
        return;
      }

      if (!paymentId) {
        const payment = await this.paymentService.create({
          customer,
          amount: payload.amount,
          currency: 'rub',
          method: 'trbt',
        });
        paymentId = payment.id;
      }

      // Без await продление терялось молча: платёж записан, пользователю
      // отрапортовано об успехе, а подписка не выдана.
      await this.subscriptionService.upsertUserSubscription({
        telegramId: payload.telegram_user_id.toString(),
        period,
        createdVia: 'paid',
        amount: payload.amount,
      });

      await this.markCompleted(event.id, paymentId);

      const days = SUBSCRIPTION_PERIODS[period];
      await this.telegramService.sendMessage(
        payload.telegram_user_id.toString(),
        `🎉 Оплата прошла успешно!\nВы получили премиум на ${days} дней. 🔥\nСпасибо, что выбираете нас 💙`,
      );
    } catch (e) {
      // Постоянную ошибку (неизвестный период, кривое тело) ретраить
      // бессмысленно: провайдер будет долбиться вечно, а результат не
      // изменится. Закрываем событие и отвечаем 200, оставив причину в
      // lastError. Временные сбои (панель недоступна) — наоборот, отдаём
      // на повтор: ретрай единственный шанс довести оплату до подписки.
      //
      // Ключевая оговорка: «постоянная» она только пока деньги не тронуты.
      // upsertUserSubscription тоже бросает BadRequestException, но уже ПОСЛЕ
      // создания платежа — закрыть такое событие значит снова потерять
      // оплату. Если paymentId есть, всегда отдаём на повтор.
      const permanent = e instanceof BadRequestException && !paymentId;

      if (permanent) {
        await this.markCompleted(event.id, paymentId);
        await this.prisma.webhookEvent.update({
          where: { id: event.id },
          data: { lastError: (e as Error).message?.slice(0, 500) },
        });
        this.logger.error(
          `[TRBT] Permanent failure, no retry: ${this.buildExternalId(body)} — ${(e as Error).message}`,
        );
        return;
      }

      await this.markFailed(event.id, e, paymentId);
      this.logger.error(
        `[TRBT] Processing failed, event released for retry: ${this.buildExternalId(body)}`,
        e as Error,
      );
      throw e;
    }
  }

  async processTrbtCancelledSubscription(body: TrbtWebhookDto) {
    const event = await this.claimEvent(body);
    if (!event) return;

    this.logger.debug(
      `[TRBT] Cancelled purchase: subscription=${body.payload.subscription_id}`,
    );

    await this.markCompleted(event.id);
  }
}
