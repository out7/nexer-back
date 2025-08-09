import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ActivityLogType } from '@prisma/client';

@Injectable()
export class ActivityLogLogger {
  constructor(private readonly prisma: PrismaService) {}

  async log<T extends object>(
    customerId: string,
    type: ActivityLogType,
    meta: T,
  ) {
    await this.prisma.activityLog.create({
      data: {
        customerId,
        type,
        meta,
      },
    });
  }
}
