import { DocumentBuilder } from '@nestjs/swagger';

export function getSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('NexerVPN API')
    .setDescription('NexerVPN REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
}
