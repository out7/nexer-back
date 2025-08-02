import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthDataDto {
  @ApiProperty({
    required: true,
    description: 'Telegram initData',
  })
  @IsNotEmpty({ message: 'Telegram initData required' })
  @IsString({ message: 'data must be a string' })
  data: string;
}
