import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TelegramService } from './telegram/telegram/telegram.service';
import express from 'express';
import { LoggerService } from './common/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const loggerService = app.get(LoggerService);
  const telegramService = app.get(TelegramService);
  app.useGlobalFilters(
    new GlobalExceptionFilter(loggerService, telegramService),
  );
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  app.use(helmet());
  app.enableCors({
    origin: 'http://localhost:3001',
    credentials: true,
  });
  app.use(express.json({ limit: '10mb' }));

  const config = new DocumentBuilder()
    .setTitle('Quests API')
    .setDescription('API для бронирования квестов')
    .setVersion('1.0')
    .addTag('auth', 'Аутентификация')
    .addTag('users', 'Пользователи')
    .addTag('quests', 'Квесты')
    .addTag('services', 'Дополнительные услуги')
    .addTag('bookings', 'Бронирования')
    .addTag('blocked-slots', 'Блокировка времени')
    .addTag('settings', 'Настройки')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
