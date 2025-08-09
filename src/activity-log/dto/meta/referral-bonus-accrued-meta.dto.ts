import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ReferralBonusAccruedMetaDto {
  @ApiProperty({ example: 7, description: 'Days accrued to bonus bank' })
  @IsInt()
  days: number;

  @ApiProperty({
    example: '944276139',
    description: 'Referee Telegram ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  refereeTelegramId?: string;

  @ApiProperty({ example: 'payment_abc123', required: false })
  @IsOptional()
  @IsString()
  sourcePaymentId?: string;
}
