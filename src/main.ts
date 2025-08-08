import 'module-alias/register';

import { setupSwagger } from '@/utils/swagger.util';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1.0');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: [
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'http://10.10.100.33:3000',
      'http://10.10.100.177:3000',
      'http://192.168.0.212:3000',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  });

  setupSwagger(app);

  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
