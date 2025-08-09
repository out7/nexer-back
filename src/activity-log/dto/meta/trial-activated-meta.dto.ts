import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class TrialActivatedMetaDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  grantedDays: number;
}
