import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionSource, SubscriptionStatus } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';

export class CustomerSubscriptionResponseDto {
  @ApiProperty({ description: 'Internal subscription ID (UUID)' })
  @Exclude()
  id: string;

  @ApiProperty({
    description: 'Current subscription status',
    enum: SubscriptionStatus,
    example: 'active',
  })
  @Expose()
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'Start date of the subscription (if active)',
    type: String,
    nullable: true,
  })
  @Expose()
  startDate: Date | null;

  @ApiProperty({
    description: 'End date of the subscription (if active)',
    type: String,
    nullable: true,
  })
  @Expose()
  endDate: Date | null;

  @ApiProperty({
    description: 'How the subscription was created (e.g. paid, trial, bonus)',
    enum: SubscriptionSource,
    nullable: true,
    example: 'trial',
  })
  @Expose()
  createdVia: SubscriptionSource | null;

  @ApiProperty({
    description: 'Manual VPN subscription URL (e.g. vmess://...)',
    nullable: true,
  })
  @Expose()
  subscriptionUrl: string | null;

  @ApiProperty({
    description: 'Whether the free trial was already activated',
    example: false,
  })
  @Expose()
  trialActivated: boolean;

  @ApiProperty({
    description: 'Timestamp when subscription was created',
    type: String,
  })
  @Exclude()
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp of last subscription update',
    type: String,
  })
  @Exclude()
  updatedAt: Date;
}
