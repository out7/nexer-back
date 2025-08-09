import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional } from 'class-validator';

export class PurchasedMetaDto {
  @ApiProperty({ example: 30, description: 'Subscription period in days' })
  @IsInt()
  period: number;

  @ApiProperty({
    example: 'telegram_stars',
    enum: ['telegram_stars', 'trbt'],
    description: 'Payment platform used for the purchase',
  })
  @IsIn(['telegram_stars', 'trbt'])
  platform: 'telegram_stars' | 'trbt';

  @ApiProperty({
    example: 10100,
    description: 'Amount paid in minor currency units',
    required: false,
  })
  @IsOptional()
  @IsInt()
  amount?: number;
}
