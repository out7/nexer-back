import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class SubscriptionExpiredMetaDto {
  @ApiProperty({
    example: '2025-09-10T12:00:00Z',
    description: 'Дата окончания подписки',
  })
  @Expose()
  @IsString()
  expiredAt: string;
}
