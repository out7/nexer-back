import { ApiProperty } from '@nestjs/swagger';

export class TrbtWebhookPayloadDto {
  @ApiProperty({
    example: 'Поддержите творчество 🌟',
    description: 'Subscription name',
  })
  subscription_name: string;

  @ApiProperty({
    example: 1644,
    description: 'Subscription ID',
  })
  subscription_id: number;

  @ApiProperty({
    example: 1547,
    description: 'Subscription period ID',
  })
  period_id: number;

  @ApiProperty({
    example: 'monthly',
    enum: ['monthly', 'quarterly', 'yearly'],
    description: 'Subscription period',
  })
  period: string;

  @ApiProperty({
    example: 1000,
    description: 'Price in minor units of currency (e.g. kopecks, cents)',
    type: Number,
  })
  price: number;

  @ApiProperty({
    example: 700,
    description: 'Final payment amount after fees (minor units)',
    type: Number,
  })
  amount: number;

  @ApiProperty({
    example: 'eur',
    description: 'Currency ISO 4217 code',
  })
  currency: string;

  @ApiProperty({
    example: 31326,
    description: 'User ID in external system',
  })
  user_id: number;

  @ApiProperty({
    example: 12321321,
    description: 'Telegram user ID',
    type: Number,
  })
  telegram_user_id: number;

  @ApiProperty({
    example: 614,
    description: 'Channel ID',
  })
  channel_id: number;

  @ApiProperty({
    example: 'lbs',
    description: 'Channel name',
  })
  channel_name: string;

  @ApiProperty({
    example: '2025-04-20T01:15:57.305733Z',
    description: 'Subscription expiry date (ISO 8601)',
  })
  expires_at: string;

  @ApiProperty({
    example: 'https://t.me/tribute/app?startapp=sz3y',
    required: false,
  })
  web_app_link?: string;
}
