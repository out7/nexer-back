import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { ActivityLogType } from '@prisma/client';
import { Exclude, Expose, Transform, plainToInstance } from 'class-transformer';
import { IsEnum, IsISO8601, IsString, ValidateNested } from 'class-validator';

import { SubscriptionExpiredMetaDto } from '@/activity-log/dto/meta/subscription-expired-meta.dto';
import { SubscriptionExtendedMetaDto } from '@/activity-log/dto/meta/subscription-extended-meta.dto';
import { SubscriptionPurchasedMetaDto } from '@/activity-log/dto/meta/subscription-purchased-meta.dto';
import { BonusClaimedMetaDto } from './meta/bonus-claimed-meta.dto';
import { ReferralBonusAddedMetaDto } from './meta/referral-bonus-added-meta.dto';
import { TrialActivatedMetaDto } from './meta/trial-activated-meta.dto';

type MetaUnion =
  | SubscriptionPurchasedMetaDto
  | SubscriptionExtendedMetaDto
  | SubscriptionExpiredMetaDto
  | BonusClaimedMetaDto
  | TrialActivatedMetaDto
  | ReferralBonusAddedMetaDto;

const META_MAP: Record<ActivityLogType, new () => MetaUnion> = {
  subscription_purchased: SubscriptionPurchasedMetaDto,
  subscription_extended: SubscriptionExtendedMetaDto,
  subscription_expired: SubscriptionExpiredMetaDto,
  bonus_claimed: BonusClaimedMetaDto,
  trial_activated: TrialActivatedMetaDto,
  referral_bonus_added: ReferralBonusAddedMetaDto,
};

@ApiExtraModels(
  SubscriptionPurchasedMetaDto,
  SubscriptionExtendedMetaDto,
  SubscriptionExpiredMetaDto,
  BonusClaimedMetaDto,
  TrialActivatedMetaDto,
  ReferralBonusAddedMetaDto,
)
export class ActivityLogDto {
  @ApiProperty({ example: 'f7d5c79a-...' })
  @Exclude()
  @IsString()
  id: string;

  @ApiProperty({ example: '9f2a6a1e-...' })
  @Expose()
  @IsString()
  customerId: string;

  @ApiProperty({ enum: Object.values(ActivityLogType), example: 'purchased' })
  @Expose()
  @IsEnum(ActivityLogType)
  type: ActivityLogType;

  @ApiProperty({
    description: 'Event-specific metadata. Shape depends on "type".',
    oneOf: [
      { $ref: getSchemaPath(SubscriptionPurchasedMetaDto) },
      { $ref: getSchemaPath(SubscriptionExtendedMetaDto) },
      { $ref: getSchemaPath(SubscriptionExpiredMetaDto) },
      { $ref: getSchemaPath(BonusClaimedMetaDto) },
      { $ref: getSchemaPath(TrialActivatedMetaDto) },
      { $ref: getSchemaPath(ReferralBonusAddedMetaDto) },
    ],
  })
  @Expose()
  @ValidateNested()
  @Transform(
    ({ value, obj }) => {
      const Target = META_MAP[obj.type as ActivityLogType];
      return Target
        ? plainToInstance(Target, value, { excludeExtraneousValues: true })
        : value;
    },
    { toClassOnly: true },
  )
  meta: MetaUnion;

  @ApiProperty({ example: '2025-08-08T10:22:33.214Z' })
  @Expose()
  @IsISO8601()
  createdAt: string;
}
