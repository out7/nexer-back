import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ReferralBonusAddedMetaDto {
  @ApiProperty({ example: 7, description: 'Days added to bonus bank' })
  @Expose()
  @IsInt()
  days: number;

  @ApiProperty({
    example: '944276139',
    description: 'Referee Telegram ID',
    required: false,
  })
  @Exclude()
  @IsOptional()
  @IsString()
  refereeTelegramId?: string;

  @ApiProperty({ example: 'payment_abc123', required: false })
  @Exclude()
  @IsOptional()
  @IsString()
  sourcePaymentId?: string;
}
