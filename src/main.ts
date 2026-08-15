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
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TelegramError } from 'telegraf';
import { AppModule } from './app.module';

/**
 * Telegraf запускается в onApplicationBootstrap уже ПОСЛЕ того, как Nest
 * поднялся, и ошибку getMe/launch бросает необработанным промисом — процесс
 * падал целиком. Вместе с ботом при этом умирали вебхук оплат и Mini App,
 * а при restart: always получался цикл перезапусков: недоступный на минуту
 * Telegram выносил приём платежей.
 *
 * Гасим ТОЛЬКО эту ошибку и только громко: остальные необработанные
 * отказы по-прежнему роняют процесс, иначе так и будут прятаться баги.
 */
function surviveTelegramLaunchFailure() {
  const logger = new Logger('Bootstrap');

  process.on('unhandledRejection', (reason: any) => {
    // Именно instanceof: у TelegramError поле name равно "Error", а
    // «TelegramError» в логе печатает Node по имени конструктора.
    const method = (reason as { on?: { method?: string } })?.on?.method;
    const isTelegramLaunch =
      reason instanceof TelegramError &&
      !!method &&
      ['getMe', 'getUpdates', 'deleteWebhook'].includes(method);

    if (!isTelegramLaunch) throw reason;

    logger.error(
      `Бот не запустился (${reason?.on?.method}): ${reason?.message}. ` +
        'HTTP API продолжает работать — вебхук оплат и Mini App живы, ' +
        'но команды бота и уведомления не работают, пока Telegram недоступен.',
    );
  });
}

async function bootstrap() {
  surviveTelegramLaunchFailure();

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
