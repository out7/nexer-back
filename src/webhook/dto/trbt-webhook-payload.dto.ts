import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * Обязательными помечены только те поля, от которых зависит обработка.
 * Всё остальное — опционально: если Tribute перестанет присылать, скажем,
 * channel_name, валидация не должна отвергать платёж и загонять провайдера
 * в бесконечный ретрай.
 */
export class TrbtWebhookPayloadDto {
  // ── Используется обработчиком ────────────────────────────────────────────

  @ApiProperty({ example: 1644, description: 'Subscription ID' })
  @IsNumber()
  subscription_id: number;

  @ApiProperty({ example: 1547, description: 'Subscription period ID' })
  @IsNumber()
  period_id: number;

  @ApiProperty({
    example: 'monthly',
    enum: ['monthly', 'quarterly', 'halfyearly', 'yearly'],
    description: 'Subscription period',
  })
  @IsString()
  period: string;

  @ApiProperty({
    example: 700,
    description: 'Final payment amount after fees (minor units)',
    type: Number,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: 12321321,
    description: 'Telegram user ID',
    type: Number,
  })
  @IsNumber()
  telegram_user_id: number;

  // ── Справочные: пишем в журнал события, но на логику не влияют ───────────

  @ApiPropertyOptional({ example: 'Поддержите творчество 🌟' })
  @IsOptional()
  @IsString()
  subscription_name?: string;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Price in minor units of currency (e.g. kopecks, cents)',
  })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ example: 'eur', description: 'Currency ISO 4217' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 31326, description: 'User ID in external system' })
  @IsOptional()
  @IsNumber()
  user_id?: number;

  @ApiPropertyOptional({ example: 614, description: 'Channel ID' })
  @IsOptional()
  @IsNumber()
  channel_id?: number;

  @ApiPropertyOptional({ example: 'lbs', description: 'Channel name' })
  @IsOptional()
  @IsString()
  channel_name?: string;

  @ApiPropertyOptional({
    example: '2025-04-20T01:15:57.305733Z',
    description: 'Subscription expiry date (ISO 8601)',
  })
  @IsOptional()
  @IsString()
  expires_at?: string;

  @ApiPropertyOptional({ example: 'https://t.me/tribute/app?startapp=sz3y' })
  @IsOptional()
  @IsString()
  web_app_link?: string;
}
