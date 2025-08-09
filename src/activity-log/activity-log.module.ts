import { ActivityLogLogger } from '@/activity-log/activity-log.logger';
import { Module } from '@nestjs/common';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogService } from './activity-log.service';

@Module({
  providers: [ActivityLogService, ActivityLogLogger],
  controllers: [ActivityLogController],
  exports: [ActivityLogLogger],
})
export class ActivityLogModule {}
