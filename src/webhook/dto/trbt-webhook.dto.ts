import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';
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

  @ApiProperty({ type: TrbtWebhookPayloadDto })
  @IsObject()
  payload: TrbtWebhookPayloadDto;
}
