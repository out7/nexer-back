import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { ActivityLogType } from '@prisma/client';
import { Expose, Transform, plainToInstance } from 'class-transformer';
import { IsEnum, IsISO8601, IsString, ValidateNested } from 'class-validator';

import { BonusClaimedMetaDto } from './meta/bonus-claimed-meta.dto';
import { PurchasedMetaDto } from './meta/purchased-meta.dto';
import { ReferralBonusAccruedMetaDto } from './meta/referral-bonus-accrued-meta.dto';
import { TrialActivatedMetaDto } from './meta/trial-activated-meta.dto';

type MetaUnion =
  | PurchasedMetaDto
  | BonusClaimedMetaDto
  | TrialActivatedMetaDto
  | ReferralBonusAccruedMetaDto;

const META_MAP: Record<ActivityLogType, new () => MetaUnion> = {
  purchased: PurchasedMetaDto,
  bonus_claimed: BonusClaimedMetaDto,
  trial_activated: TrialActivatedMetaDto,
  referral_bonus_accrued: ReferralBonusAccruedMetaDto,
};

@ApiExtraModels(
  PurchasedMetaDto,
  BonusClaimedMetaDto,
  TrialActivatedMetaDto,
  ReferralBonusAccruedMetaDto,
)
export class ActivityLogDto {
  @ApiProperty({ example: 'f7d5c79a-...' })
  @Expose()
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
      { $ref: getSchemaPath(PurchasedMetaDto) },
      { $ref: getSchemaPath(BonusClaimedMetaDto) },
      { $ref: getSchemaPath(TrialActivatedMetaDto) },
      { $ref: getSchemaPath(ReferralBonusAccruedMetaDto) },
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
