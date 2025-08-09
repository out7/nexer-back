import { ActivityLogDto } from '@/activity-log/dto/activity-log.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCustomerId(customerId: string): Promise<ActivityLogDto[]> {
    const activityLogs = await this.prisma.activityLog.findMany({
      where: {
        customerId,
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
