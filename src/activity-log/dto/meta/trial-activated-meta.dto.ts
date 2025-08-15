import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsInt } from 'class-validator';

export class TrialActivatedMetaDto {
  @ApiProperty({ example: 3 })
  @Expose()
  @IsInt()
  grantedDays: number;
}
