import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ReferredDto {
  @ApiProperty({
    type: String,
    description: 'Telegram ID of the referred user (stringified BigInt)',
  })
  @Expose()
  telegramId: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Telegram username of the referred user',
  })
  @Expose()
  username: string | null;
}
