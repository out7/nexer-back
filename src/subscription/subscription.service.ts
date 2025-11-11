import { ActivityLogLogger } from '@/activity-log/activity-log.logger';
import { SUBSCRIPTION_PERIODS } from '@/common/constants/subscription.constants';
import { CustomerResponseDto } from '@/customer/dto/customer-response.dto';
import { formatTelegramId } from '@/customer/helpers/format-telegram-id.helper';
import { PrismaService } from '@/prisma/prisma.service';
import { RemnawaveService } from '@/remnawave/remnawave.service';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ActivityLogType } from '@prisma/client';
import { UpsertSubscriptionParams } from './types/upsert-subscription-params.type';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly remnawaveService: RemnawaveService,
    private readonly activityLogLogger: ActivityLogLogger,
  ) {}

  async upsertUserSubscription(
    params: UpsertSubscriptionParams,
  ): Promise<CustomerResponseDto | null> {
    const {
      telegramId,
      days,
      period,
      trialActivated,
      createdVia,
      platform,
      log = true,
      amount,
    } = params;

    const durationDays =
      days ?? (period ? SUBSCRIPTION_PERIODS[period] : undefined);

    this.logger.debug(
      `[SUBSCRIPTION] Upsert started: tgId=${telegramId} createdVia=${createdVia} platform=${platform ?? '-'} period=${period ?? '-'} days=${days ?? '-'} → durationDays=${durationDays ?? '-'}`,
    );

    let customer = await this.prisma.customer.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: { customerSubscription: true },
    });

    if (!customer) {
      this.logger.error(
        `[SUBSCRIPTION] Customer not found: tgId=${telegramId}`,
      );
      throw new BadRequestException('Customer not found');
    }

    if (!durationDays) {
      this.logger.error(
        `[SUBSCRIPTION] No valid period for tgId=${telegramId}`,
      );
      throw new BadRequestException('No days or valid period provided');
    }

    const now = new Date();
    const sub = customer.customerSubscription;
    const isActive = !!(
      sub &&
      sub.status === 'active' &&
      sub.endDate &&
      sub.endDate > now
    );
    const previousEndDate = isActive ? sub!.endDate! : null;
    const startDate = isActive ? (sub!.startDate ?? now) : now;
    const baseEnd = previousEndDate ?? now;
    const newEndDate = new Date(
      baseEnd.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );

    const isBonusCall = createdVia === 'bonus';
    const createdViaForUpdate = isBonusCall
      ? sub?.createdVia == null || sub?.createdVia === 'trial'
        ? 'bonus'
        : sub.createdVia
      : createdVia;

    this.logger.debug(
      `[SUBSCRIPTION] ${isActive ? 'Extending' : 'Creating'} subscription: start=${startDate.toISOString()} end=${newEndDate.toISOString()}`,
    );

    const updatedCustomer = await this.prisma.$transaction(async (tx) => {
      const remnawaveCustomer = await this.remnawaveService.activateVpnAccess(
        String(telegramId),
        newEndDate,
      );

      this.logger.debug(
        `[SUBSCRIPTION] Remnawave activated for ${remnawaveCustomer.response.username}, status=${remnawaveCustomer.response.status}`,
      );

      await tx.customerSubscription.upsert({
        where: { customerId: customer.id },
        update: {
          status: 'active',
          startDate,
          endDate: newEndDate,
          createdVia: createdViaForUpdate,
          trialActivated: !!trialActivated || sub?.trialActivated || false,
          subscriptionUrl: remnawaveCustomer.response.subscriptionUrl,
        },
        create: {
          customerId: customer.id,
          status: 'active',
          startDate,
          endDate: newEndDate,
          createdVia,
          trialActivated: !!trialActivated,
          subscriptionUrl: remnawaveCustomer.response.subscriptionUrl,
        },
      });

      return tx.customer.findUnique({
        where: { id: customer.id },
        include: { customerSubscription: true },
      });
    });

    if (log && updatedCustomer) {
      try {
        switch (createdVia) {
          case 'paid':
            if (isActive) {
              await this.activityLogLogger.log(
                updatedCustomer.id,
                ActivityLogType.subscription_extended,
                {
                  daysAdded: durationDays,
                  platform: platform ?? 'trbt',
                  ...(typeof amount === 'number' ? { amount } : {}),
                  previousEndDate: previousEndDate?.toISOString(),
                  newEndDate: newEndDate.toISOString(),
                },
              );
            } else {
              await this.activityLogLogger.log(
                updatedCustomer.id,
                ActivityLogType.subscription_purchased,
                {
                  period: durationDays,
                  platform: platform ?? 'trbt',
                  ...(typeof amount === 'number' ? { amount } : {}),
                  newEndDate: newEndDate.toISOString(),
                },
              );
            }
            break;
          case 'bonus':
            await this.activityLogLogger.log(
              updatedCustomer.id,
              ActivityLogType.bonus_claimed,
              {
                days: durationDays,
                previousEndDate: previousEndDate?.toISOString(),
                newEndDate: newEndDate.toISOString(),
              },
            );
            break;
          case 'trial':
            await this.activityLogLogger.log(
              updatedCustomer.id,
              ActivityLogType.trial_activated,
              {
                grantedDays: durationDays,
              },
            );
            break;
        }
      } catch (e) {
        this.logger.warn(
          `[SUBSCRIPTION] Failed to write ActivityLog for tgId=${telegramId}`,
          e,
        );
      }
    }

    this.logger.debug(`[SUBSCRIPTION] Upsert completed: tgId=${telegramId}`);
    return formatTelegramId(updatedCustomer);
  }

  async claimBonusDays(telegramId: string): Promise<CustomerResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    const days = customer.unclaimedBonusDays ?? 0;
    if (days <= 0) {
      throw new BadRequestException('No unclaimed bonus days');
    }

    const updatedCustomer = await this.upsertUserSubscription({
      telegramId,
      days,
      createdVia: 'bonus',
      log: true,
    });

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { unclaimedBonusDays: 0 },
    });

    return updatedCustomer!;
  }
}
