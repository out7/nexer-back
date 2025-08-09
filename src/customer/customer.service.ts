import { ActivityLogLogger } from '@/activity-log/activity-log.logger';
import { SubscriptionService } from '@/subscription/subscription.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { InitData } from '@telegram-apps/init-data-node';
import { formatTelegramId } from '../customer/helpers/format-telegram-id.helper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly activityLogLogger: ActivityLogLogger,
  ) {}

  async findOrCreate(initData: InitData) {
    if (!initData.user) {
      throw new Error('Invalid initData: user is missing');
    }

    const customer = await this.prisma.customer.upsert({
      where: { telegramId: initData.user.id },
      update: {
        username: initData.user.username ?? null,
        language: initData.user.language_code,
      },
      create: {
        telegramId: initData.user.id,
        username: initData.user.username,
        language: initData.user.language_code ?? 'ru',
        customerSubscription: {
          create: {},
        },
      },
    });

    return formatTelegramId(customer);
  }

  async getProfile(telegramId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: { customerSubscription: true },
    });

    return formatTelegramId(customer);
  }

  async findOneByTelegramId(telegramId: string) {
    const user = await this.prisma.customer.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
      return null;
    }

    return formatTelegramId(user);
  }

  async updateHashedRefreshToken(telegramId: string, hashedRT: string) {
    const customer = await this.prisma.customer.update({
      where: { telegramId: BigInt(telegramId) },
      data: { refreshToken: hashedRT },
    });

    if (!customer) {
      return null;
    }

    return formatTelegramId(customer);
  }

  async activateTrial(telegramId: string) {
    let customer = await this.prisma.customer.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: { customerSubscription: true },
    });

    if (!customer) throw new BadRequestException('Customer not found');

    if (customer.customerSubscription?.trialActivated) {
      throw new BadRequestException('Trial already used');
    }

    await this.subscriptionService.upsertUserSubscription({
      telegramId,
      days: 3,
      period: 'trial_3d',
      trialActivated: true,
      createdVia: 'trial',
    });

    // await this.activityLogLogger.log(
    //   customer.id,
    //   ActivityLogType.trial_activated,
    //   {
    //     trialDays: 3,
    //   },
    // );

    const updated = await this.prisma.customer.findUnique({
      where: { id: customer.id },
      include: { customerSubscription: true },
    });

    return formatTelegramId(updated!);
  }
}
