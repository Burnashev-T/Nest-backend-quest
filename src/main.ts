import * as dotenv from 'dotenv';
dotenv.config(); // <-- сначала загружаем .env

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Для Express — получаем внутренний экземпляр и вызываем set
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  app.use(helmet());
  app.enableCors();

  // Swagger configuration
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
    .addBearerAuth() // 👈 добавляем поддержку Bearer токена
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
