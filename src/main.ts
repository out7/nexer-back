import 'module-alias/register';

import * as dotenv from 'dotenv';

// ENV_FILE — для локального стенда, чтобы не перетирать боевой .env.
// override обязателен: @prisma/client при импорте уже успевает затянуть .env
// в process.env, а dotenv по умолчанию заданное не перезаписывает — без
// override стенд молча поднимался бы на боевых значениях.
if (process.env.ENV_FILE) {
  dotenv.config({ path: process.env.ENV_FILE, override: true });
}

import { setupSwagger } from '@/utils/swagger.util';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody нужен вебхуку Tribute: подпись считается от сырых байт тела,
  // пересобранный из объекта JSON для этого не годится.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1.0');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const origins =
    config
      .get<string>('ALLOWED_ORIGIN')
      ?.split(',')
      .map((o) => o.trim())
      .filter(Boolean) ?? [];

  // Пустой список молча запрещал всё: приложение поднималось, но любой запрос
  // с фронта отлетал по CORS без внятной причины. Лучше не стартовать.
  if (origins.length === 0) {
    throw new Error(
      'ALLOWED_ORIGIN is empty — CORS would reject every browser request',
    );
  }

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
