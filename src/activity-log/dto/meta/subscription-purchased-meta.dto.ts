import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class SubscriptionPurchasedMetaDto {
  @ApiProperty({ example: 30, description: 'Subscription period in days' })
  @Expose()
  @IsInt()
  period: number;

  @ApiProperty({
    example: 'telegram_stars',
    enum: ['telegram_stars', 'trbt'],
    description: 'Payment platform used for the purchase',
  })
  @Exclude()
  @IsEnum(['telegram_stars', 'trbt'])
  platform: 'telegram_stars' | 'trbt';

  @ApiProperty({
    example: 10100,
    description: 'Amount paid in minor currency units',
    required: false,
  })
  @Exclude()
  @IsOptional()
  @IsInt()
  amount?: number;

  @ApiProperty({
    example: '2025-09-17T12:00:00Z',
    description: 'New subscription end date (ISO string)',
    required: false,
  })
  @Exclude()
  @IsOptional()
  @IsString()
  newEndDate?: string;
}
