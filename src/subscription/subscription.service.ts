import { SUBSCRIPTION_PERIODS } from '@/common/constants/subscription.constants';
import { CustomerResponseDto } from '@/customer/dto/customer-response.dto';
import { formatTelegramId } from '@/customer/helpers/format-telegram-id.helper';
import { PrismaService } from '@/prisma/prisma.service';
import { RemnawaveService } from '@/remnawave/remnawave.service';
import { Injectable } from '@nestjs/common';
import { UpsertSubscriptionParams } from './types/upsert-subscription-params.type';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly remnawaveService: RemnawaveService,
  ) {}

  async upsertUserSubscription(
    params: UpsertSubscriptionParams,
  ): Promise<CustomerResponseDto | null> {
    const { telegramId, days, period, trialActivated, createdVia } = params;

    let customer = await this.prisma.customer.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: { customerSubscription: true },
    });
    if (!customer) throw new Error('Customer not found');

    const sub = customer.customerSubscription;

    let durationDays = days;
    if (!durationDays && period) {
      durationDays = SUBSCRIPTION_PERIODS[period];
    }
    if (!durationDays) throw new Error('No days or valid period provided');

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (sub && sub.status === 'active' && sub.endDate && sub.endDate > now) {
      startDate = sub.startDate ?? now;
      endDate = new Date(
        sub.endDate.getTime() + durationDays * 24 * 60 * 60 * 1000,
      );
    } else {
      startDate = now;
      endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    const remnawaveCustomer = await this.remnawaveService.activateVpnAccess(
      telegramId,
      endDate,
    );

    await this.prisma.customerSubscription.upsert({
      where: { customerId: customer.id },
      update: {
        status: 'active',
        startDate,
        endDate,
        createdVia,
        trialActivated: !!trialActivated,
        subscriptionUrl: remnawaveCustomer.response.subscriptionUrl,
      },
      create: {
        customerId: customer.id,
        status: 'active',
        startDate,
        endDate,
        createdVia,
        trialActivated: !!trialActivated,
        subscriptionUrl: remnawaveCustomer.response.subscriptionUrl,
      },
    });

    customer = await this.prisma.customer.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: { customerSubscription: true },
    });

    return formatTelegramId(customer);
  }
}
