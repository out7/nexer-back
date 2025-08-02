import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { CustomerSubscriptionResponseDto } from './customer-subscription.dto';

export class CustomerResponseDto {
  @ApiProperty({ description: 'Internal customer ID (UUID)' })
  @Exclude()
  id: string;

  @ApiProperty({ description: 'Telegram user ID (numeric)' })
  @Expose()
  telegramId: number;

  @ApiProperty({
    description: 'Telegram username (if available)',
    nullable: true,
  })
  @Expose()
  username: string | null;

  @ApiProperty({ description: 'User language code, e.g. "en" or "ru"' })
  @Expose()
  language: string;

  @ApiProperty({ description: 'ID of the referrer (if any)', nullable: true })
  @Exclude()
  referredById: string | null;

  @ApiProperty({
    description: 'Unclaimed bonus days from referrals or promotions',
  })
  @Expose()
  unclaimedBonusDays: number;

  @ApiProperty({ description: 'Customer registration timestamp' })
  @Exclude()
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp of the customer record' })
  @Exclude()
  updatedAt: Date;

  @ApiProperty({
    description: 'Customer subscription info (if exists)',
    type: () => CustomerSubscriptionResponseDto,
    nullable: true,
  })
  @Expose()
  @Type(() => CustomerSubscriptionResponseDto)
  customerSubscription: CustomerSubscriptionResponseDto | null;
}
