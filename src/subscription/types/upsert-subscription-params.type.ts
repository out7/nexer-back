import { SUBSCRIPTION_PERIODS } from '@/common/constants/subscription.constants';
import { SubscriptionSource } from '@prisma/client';

type Platform = 'trbt' | 'telegram_stars';

export interface UpsertSubscriptionParams {
  telegramId: string;
  days?: number;
  period?: keyof typeof SUBSCRIPTION_PERIODS;
  trialActivated?: boolean;
  createdVia: SubscriptionSource;
  platform?: Platform;
  log?: boolean;
  amount?: number;
}
