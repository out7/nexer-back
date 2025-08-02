import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { InitData } from '@telegram-apps/init-data-node';
import { formatTelegramId } from '../customer/helpers/format-telegram-id.helper';
import { PrismaService } from '../prisma/prisma.service';
import { RemnawaveService } from '../remnawave/remnawave.service';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly remnawaveService: RemnawaveService,
    private readonly configService: ConfigService,
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
    });

    return formatTelegramId(customer);
  }

  async findOneByTelegramId(tgId: string) {
    const user = await this.prisma.customer.findUnique({
      where: { telegramId: BigInt(tgId) },
    });

    if (!user) {
      return null;
    }

    return formatTelegramId(user);
  }

  async activateTrial(telegramId: string) {
    let customer = await this.prisma.customer.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: { customerSubscription: true },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    const subscription = customer.customerSubscription;

    if (subscription?.trialActivated) {
      throw new BadRequestException('Trial already used');
    }

    const trialDays = parseInt(
      this.configService.getOrThrow('TRIAL_DURATION_DAYS'),
      10,
    );
    const now = new Date();
    const newEnd = new Date(subscription?.endDate ?? now);
    newEnd.setDate(newEnd.getDate() + trialDays);

    if (subscription?.status === 'active') {
      await this.remnawaveService.createTrialSubscription(telegramId, newEnd);
      await this.prisma.customerSubscription.update({
        where: { customerId: customer.id },
        data: {
          endDate: newEnd,
          trialActivated: true,
        },
      });
    } else {
      const customerUser = await this.remnawaveService.createTrialSubscription(
        telegramId,
        newEnd,
      );
      await this.prisma.customerSubscription.update({
        where: { customerId: customer.id },
        data: {
          status: 'active',
          startDate: now,
          endDate: newEnd,
          createdVia: 'trial',
          trialActivated: true,
          subscriptionUrl: customerUser.response.subscriptionUrl,
        },
      });
    }

    customer = await this.prisma.customer.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: { customerSubscription: true },
    });

    return formatTelegramId(customer);
  }
}
