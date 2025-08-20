import { ActivityLogLogger } from '@/activity-log/activity-log.logger';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { ReferralStatus } from '@prisma/client';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogLogger,
  ) {}

  async create(params: {
    referrerId: string;
    referredId: string;
    status: ReferralStatus;
  }) {
    const referral = await this.prisma.referral.create({
      data: {
        referrerId: params.referrerId,
        referredId: params.referredId,
        status: params.status ?? 'inactive',
      },
    });

    return referral;
  }

  async updateStatus(referredId: string, status: ReferralStatus) {
    return this.prisma.referral.update({
      where: { referredId },
      data: { status },
    });
  }
}
