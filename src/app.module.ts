import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QuestsModuleModule } from './quests-module/quests-module.module';
import { ImagesModule } from './images/images.module';
import { BookingsModule } from './bookings/bookings.module';
import { SettingsModule } from './settings/settings.module';
import { BlockedSlotsModule } from './blocked-slots/blocked-slots.module';
import { ServicesModule } from './services-module/services.module';

@Module({
  imports: [
    ConfigModule.forRoot(), // загружает .env
    TypeOrmModule.forRootAsync({
      imports: [
        ConfigModule.forRoot(),

      ],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'), // автоматически преобразует в число
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
    }),
    QuestsModuleModule,
    ImagesModule,
    ServicesModule,
    BookingsModule,
    SettingsModule,
    BlockedSlotsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
