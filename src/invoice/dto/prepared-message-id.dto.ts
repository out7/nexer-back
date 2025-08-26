// dto/prepared-message-id.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PreparedMessageIdDto {
  @ApiProperty({
    description:
      'Unique identifier of the prepared message returned by Telegram.',
    example: 'SV0IPXOK3qUxjxVL',
  })
  @Expose()
  id!: string;
}
