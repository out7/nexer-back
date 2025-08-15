import { ActivityLogDto } from '@/activity-log/dto/activity-log.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCustomerId(telegramId: string): Promise<ActivityLogDto[]> {
    const activityLogs = await this.prisma.activityLog.findMany({
      where: {
        customer: {
          telegramId: BigInt(telegramId),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return plainToInstance(ActivityLogDto, activityLogs, {
      excludeExtraneousValues: true,
    });
  }
}
