import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ActivityLogType,
  Customer,
  Payment,
  PaymentCurrency,
  PaymentMethod,
} from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(params: {
    customer: Customer;
    amount: number;
    currency: PaymentCurrency;
    method: PaymentMethod;
  }): Promise<Payment> {
    const { customer, amount, currency, method } = params;

    if (!(amount > 0)) throw new BadRequestException('Invalid amount');

    const bonusDays = parseInt(
      this.configService.getOrThrow<string>('REFERRAL_BONUS_DAYS'),
      10,
    );
    const hasReferrer =
      !!customer.referredById && customer.referredById !== customer.id;
    const canBonus = hasReferrer && Number.isFinite(bonusDays) && bonusDays > 0;

    this.logger.debug(
      `[PAYMENT] Creating payment customer=${customer.id} amount=${amount} currency=${currency} method=${method} referrer=${customer.referredById ?? '-'}`,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          customerId: customer.id,
          amount,
          currency,
          method,
          referrerId: hasReferrer ? customer.referredById! : null,
        },
      });

      if (canBonus) {
        const upd = await tx.referral.updateMany({
          where: {
            referredId: customer.id,
            status: { not: 'purchased' },
          },
          data: { status: 'purchased' },
        });

        if (upd.count === 1) {
          await tx.customer.update({
            where: { id: customer.referredById! },
            data: { unclaimedBonusDays: { increment: bonusDays } },
          });

          await tx.activityLog.create({
            data: {
              customerId: customer.referredById!,
              type: ActivityLogType.referral_bonus_added,
              meta: {
                bonusDays,
                referredCustomerId: customer.id,
                sourcePaymentId: payment.id,
              },
            },
          });

          await tx.payment.update({
            where: { id: payment.id },
            data: { referralBonusDays: bonusDays },
          });
        }
      }

      return payment;
    });

    return result;
  }
}
