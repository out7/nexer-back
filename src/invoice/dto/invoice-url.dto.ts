import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class InvoiceUrlDto {
  @ApiProperty({
    example: 'https://t.me/...',
    description: 'Direct payment URL for Telegram Stars invoice',
  })
  @Expose()
  url: string;
}
