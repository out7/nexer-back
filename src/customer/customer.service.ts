import { ActivityLogLogger } from '@/activity-log/activity-log.logger';
import { SubscriptionService } from '@/subscription/subscription.service';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { InitData } from '@telegram-apps/init-data-node';
import { formatTelegramId } from '../customer/helpers/format-telegram-id.helper';
import { normalizeLanguage } from '../customer/helpers/normalize-language.helper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
    private readonly activityLogLogger: ActivityLogLogger,
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
        language: normalizeLanguage(initData.user.language_code),
      },
      create: {
        telegramId: initData.user.id,
        username: initData.user.username,
        language: normalizeLanguage(initData.user.language_code),
        customerSubscription: {
          create: {},
        },
      },
    });

    return formatTelegramId(customer);
  }

  async create(params: {
    telegramId: string;
    username: string | null;
    language: string | 'ru';
    referredById?: string | null;
  }) {
    const customer = await this.prisma.customer.create({
      data: {
        telegramId: BigInt(params.telegramId),
        username: params.username ?? null,
        language: normalizeLanguage(params.language),
        referredById: params.referredById ?? null,
        customerSubscription: {
          create: {},
        },
      },
    });

    return formatTelegramId(customer);
  }

  async update(params: {
    telegramId: string;
    username: string | null;
    language: string | 'ru';
  }) {
    const customer = await this.prisma.customer.update({
      where: { telegramId: BigInt(params.telegramId) },
      data: {
        username: params.username ?? null,
        language: normalizeLanguage(params.language),
      },
    });

    return formatTelegramId(customer);
  }

  async getProfile(telegramId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: { customerSubscription: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

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
    const customer = await this.prisma.customer.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: { customerSubscription: true },
    });

    if (!customer) throw new BadRequestException('Customer not found');

    if (customer.customerSubscription?.trialActivated) {
      throw new BadRequestException('Trial already used');
    }

    // Проверки выше мало: два параллельных запроса оба её проходят и дают
    // 6 дней вместо 3. Флаг ставим сразу и условно — выигрывает один.
    const claimed = await this.prisma.customerSubscription.updateMany({
      where: { customerId: customer.id, trialActivated: false },
      data: { trialActivated: true },
    });

    if (claimed.count === 0) {
      throw new BadRequestException('Trial already used');
    }

    if (customer.referredById) {
      await this.prisma.referral.updateMany({
        where: { referredId: customer.id, status: 'inactive' },
        data: { status: 'trial' },
      });
    }

    try {
      await this.subscriptionService.upsertUserSubscription({
        telegramId,
        days: this.trialDurationDays(),
        trialActivated: true,
        createdVia: 'trial',
      });
    } catch (e) {
      // Флаг уже выставлен, а дни не выданы — снимаем, иначе пользователь
      // теряет триал из-за нашей ошибки.
      await this.prisma.customerSubscription.updateMany({
        where: { customerId: customer.id },
        data: { trialActivated: false },
      });
      throw e;
    }

    const updated = await this.prisma.customer.findUnique({
      where: { id: customer.id },
      include: { customerSubscription: true },
    });

    return formatTelegramId(updated!);
  }

  private trialDurationDays(): number {
    // Было захардкожено 3, при том что TRIAL_DURATION_DAYS лежит в окружении
    // и никем не читался.
    const days = Number.parseInt(
      this.configService.get<string>('TRIAL_DURATION_DAYS') ?? '3',
      10,
    );

    return Number.isFinite(days) && days > 0 ? days : 3;
  }
}
