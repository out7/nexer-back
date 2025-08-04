import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    required: true,
    description: 'refresh token',
  })
  @IsString({ message: 'refreshToken должен быть строкой' })
  @IsNotEmpty({ message: 'refreshToken не может быть пустым' })
  refreshToken: string;
}
