// bookings/bookings.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import BookingsService from './bookings.service';
import { BookingsController } from './bookings.controller';
import { Booking } from './entities/booking.entity';
import { QuestsModuleModule } from '../quests-module/quests-module.module';
import { ServicesModule } from '../services-module/services.module';
import { BlockedSlotsModule } from '../blocked-slots/blocked-slots.module';
import { SettingsModule } from '../settings/settings.module';
import { UsersModule } from '../users/users.module';
import { TelegramModule } from '../telegram/telegram/telegram.module';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking]),
    forwardRef(() => QuestsModuleModule), // <-- добавить forwardRef
    ServicesModule,
    BlockedSlotsModule,
    SettingsModule,
    UsersModule,
    TelegramModule,
    ScheduleModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
