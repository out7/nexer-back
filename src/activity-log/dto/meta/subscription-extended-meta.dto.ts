import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class SubscriptionExtendedMetaDto {
  @ApiProperty({
    example: 30,
    description: 'Days added to current subscription',
  })
  @Expose()
  @IsInt()
  daysAdded: number;

  @ApiProperty({
    example: 'telegram_stars',
    enum: ['telegram_stars', 'trbt'],
    description: 'Payment platform',
    required: false,
  })
  @Exclude()
  @IsOptional()
  @IsEnum(['telegram_stars', 'trbt'])
  platform?: 'telegram_stars' | 'trbt';

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
    example: '2025-09-10T12:00:00Z',
    description: 'Previous subscription end date (ISO string)',
    required: false,
  })
  @Exclude()
  @IsOptional()
  @IsString()
  previousEndDate?: string;

  @ApiProperty({
    example: '2025-10-10T12:00:00Z',
    description: 'New subscription end date (ISO string)',
    required: false,
  })
  @Exclude()
  @IsOptional()
  @IsString()
  newEndDate?: string;
}
