import { ActivityLogModule } from '@/activity-log/activity-log.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RemnawaveModule } from '@/remnawave/remnawave.module';
import { TelegramModule } from '@/telegram/telegram.module';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionExpirerService } from './subscription-expirer.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    RemnawaveModule,
    ActivityLogModule,
    TelegramModule,
  ],
  providers: [SubscriptionExpirerService],
})
export class SubscriptionExpirerModule {}
