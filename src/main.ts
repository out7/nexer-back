import 'module-alias/register';

import { setupSwagger } from '@/utils/swagger.util';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1.0');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const origins = config.get<string>('ALLOWED_ORIGIN')?.split(',') ?? [];

  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST'],
    credentials: true,
  });

  setupSwagger(app);

  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
