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

  constructor(
    private readonly prisma: PrismaService,
    private readonly remnawave: RemnawaveService,
    private readonly activityLog: ActivityLogLogger,
    private readonly telegramService: TelegramService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async expireOverdue() {
    const now = new Date();

    const batch = await this.prisma.customerSubscription.findMany({
      where: { status: 'active', endDate: { lte: now } },
      select: {
        endDate: true,
        customer: { select: { id: true, telegramId: true } },
      },
      take: 200,
    });

    if (!batch.length) return;

    this.logger.log(`[EXPIRE] Found ${batch.length} subscriptions to expire`);

    for (const sub of batch) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await this.remnawave.disableVpnAccess(
            sub.customer.telegramId.toString(),
          );

          await tx.customerSubscription.updateMany({
            where: {
              customerId: sub.customer.id,
              status: 'active',
              endDate: { lte: new Date() },
            },
            data: { status: 'expired' },
          });

          await this.activityLog.log(
            sub.customer.id,
            ActivityLogType.subscription_expired,
            { expiredAt: sub.endDate!.toISOString() },
          );

          await this.telegramService.sendMessage(
            sub.customer.telegramId.toString(),
            `⛔️ Ваша премиум-подписка закончилась.\nЧтобы снова пользоваться VPN без ограничений — продлите подписку в приложении. 🚀`,
          );
        });

        this.logger.debug(
          `[EXPIRE] Done for tgId=${sub.customer.telegramId.toString()}`,
        );
      } catch (e) {
        this.logger.warn(
          `[EXPIRE] Failed for tgId=${sub.customer.telegramId.toString()}: ${(e as Error).message}`,
        );
      }
    }
  }
}
