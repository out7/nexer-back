import { ApiProperty } from '@nestjs/swagger';
import { ReferralStatus } from '@prisma/client';
import { Exclude, Expose, Type } from 'class-transformer';
import { ReferredDto } from './referred.dto';

export class ReferralDto {
  @ApiProperty({ description: 'Referral record ID (UUID)' })
  @Exclude()
  id: string;

  @ApiProperty({
    enum: ReferralStatus,
    description: 'Current status of the referral',
  })
  @Expose()
  status: ReferralStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Date when the referral was created',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Date when the referral was last updated',
  })
  @Exclude()
  updatedAt: Date;

  @ApiProperty({
    type: ReferredDto,
    description: 'Information about the referred user',
  })
  @Type(() => ReferredDto)
  @Expose()
  referred: ReferredDto;
}
