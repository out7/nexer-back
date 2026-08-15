import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsString, ValidateNested } from 'class-validator';
import { TrbtWebhookPayloadDto } from './trbt-webhook-payload.dto';

export class TrbtWebhookDto {
  @ApiProperty({
    example: 'new_subscription',
    enum: ['new_subscription', 'cancelled_subscription'],
    description: 'Webhook event type',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: '2025-03-20T01:15:58.33246Z',
    description: 'Event creation time (ISO 8601)',
  })
  @IsString()
  created_at: string;

  @ApiProperty({
    example: '2025-03-20T01:15:58.542279448Z',
    description: 'Event sent time (ISO 8601)',
  })
  @IsString()
  sent_at: string;

  // Без ValidateNested + Type вложенный объект остаётся сырым и не проверяется:
  // именно из-за этого неизвестный period долетал до обработчика.
  @ApiProperty({ type: TrbtWebhookPayloadDto })
  @IsObject()
  @ValidateNested()
  @Type(() => TrbtWebhookPayloadDto)
  payload: TrbtWebhookPayloadDto;
}
