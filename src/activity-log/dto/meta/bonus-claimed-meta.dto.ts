import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class BonusClaimedMetaDto {
  @ApiProperty({
    example: 7,
    description: 'Days moved from bonus bank to subscription',
  })
  @Expose()
  @IsInt()
  days: number;

  @ApiProperty({ example: '2025-09-10T12:00:00Z', required: false })
  @Exclude()
  @IsOptional()
  @IsString()
  previousEndDate?: string;

  @ApiProperty({ example: '2025-09-17T12:00:00Z', required: false })
  @Exclude()
  @IsOptional()
  @IsString()
  newEndDate?: string;
}
