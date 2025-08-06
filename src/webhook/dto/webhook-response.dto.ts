import { ApiProperty } from '@nestjs/swagger';

export class WebhookResponseDto {
  @ApiProperty({ example: 'ok', description: 'Webhook processed successfully' })
  status: string;
}
