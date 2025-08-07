import { SUBSCRIPTION_PERIODS } from '@/common/constants/subscription.constants';
import { SubscriptionSource } from '@prisma/client';

export interface UpsertSubscriptionParams {
  telegramId: string;
  days?: number;
  period?: keyof typeof SUBSCRIPTION_PERIODS;
  trialActivated?: boolean;
  createdVia: SubscriptionSource;
}
