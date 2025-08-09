import { ActivityLogModule } from '@/activity-log/activity-log.module';
import { RemnawaveModule } from '@/remnawave/remnawave.module';
import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [RemnawaveModule, ActivityLogModule],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
