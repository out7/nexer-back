import { ActivityLogLogger } from '@/activity-log/activity-log.logger';
import { PrismaService } from '@/prisma/prisma.service';
import { RemnawaveService } from '@/remnawave/remnawave.service';
import { TelegramService } from '@/telegram/telegram.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActivityLogType } from '@prisma/client';

@Injectable()
export class SubscriptionExpirerService {
  private readonly logger = new Logger(SubscriptionExpirerService.name);

  /**
   * Защита от перекрытия проходов. Батч в 200 подписок с двумя сетевыми
   * вызовами на каждую физически не укладывался в прежние 10 секунд, и
   * следующий запуск брал те же строки: повторный disable, второй ActivityLog
   * и второе сообщение пользователю.
   */
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly remnawave: RemnawaveService,
    private readonly activityLog: ActivityLogLogger,
    private readonly telegramService: TelegramService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireOverdue() {
    if (this.isRunning) {
      this.logger.debug('[EXPIRE] Previous run still in progress, skipping');
      return;
    }

    this.isRunning = true;
    try {
      await this.runBatch();
    } finally {
      this.isRunning = false;
    }
  }

  private async runBatch() {
    const now = new Date();

    const batch = await this.prisma.customerSubscription.findMany({
      where: { status: 'active', endDate: { lte: now } },
      select: {
        endDate: true,
        customer: { select: { id: true, telegramId: true } },
      },
      orderBy: { endDate: 'asc' },
      take: 200,
    });

    if (!batch.length) return;

    this.logger.log(`[EXPIRE] Found ${batch.length} subscriptions to expire`);

    for (const sub of batch) {
      const telegramId = sub.customer.telegramId.toString();

      try {
        // Сеть — до транзакции. Раньше вызов Remnawave и отправка сообщения
        // жили внутри $transaction: панель тормозила — транзакция отваливалась
        // по таймауту, а сообщение пользователю успевало уйти до отката.
        await this.remnawave.disableVpnAccess(telegramId);

        const updated = await this.prisma.customerSubscription.updateMany({
          where: {
            customerId: sub.customer.id,
            status: 'active',
            endDate: { lte: new Date() },
          },
          data: { status: 'expired' },
        });

        // Ноль означает, что подписку уже закрыл кто-то другой (или её
        // продлили между выборкой и этим моментом) — тогда ни лога, ни
        // сообщения быть не должно.
        if (updated.count === 0) {
          this.logger.debug(`[EXPIRE] Already handled, skipping tgId=${telegramId}`);
          continue;
        }

        await this.activityLog.log(
          sub.customer.id,
          ActivityLogType.subscription_expired,
          { expiredAt: sub.endDate!.toISOString() },
        );

        // После фиксации статуса: уведомление о том, чего не произошло,
        // хуже отсутствия уведомления.
        await this.telegramService.sendMessage(
          telegramId,
          `⛔️ Ваша премиум-подписка закончилась.\nЧтобы снова пользоваться VPN без ограничений — продлите подписку в приложении. 🚀`,
        );

        this.logger.debug(`[EXPIRE] Done for tgId=${telegramId}`);
      } catch (e) {
        this.logger.warn(
          `[EXPIRE] Failed for tgId=${telegramId}: ${(e as Error).message}`,
        );
      }
    }
  }
}
