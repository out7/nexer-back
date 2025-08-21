import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ReferredDto {
  @ApiProperty({
    type: String,
    description: 'Masked Telegram ID of the referred user (last 4 digits only)',
  })
  @Expose()
  telegramId!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    description: 'Telegram username (optional)',
  })
  @Expose()
  username?: string | null;
}
