// bookings/bookings.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { Booking } from './entities/booking.entity';
import { QuestsModuleModule } from '../quests-module/quests-module.module';
import { ServicesModule } from '../services-module/services.module'; // 👈 новый импорт
import { BlockedSlotsModule } from '../blocked-slots/blocked-slots.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking]),
    QuestsModuleModule,
    ServicesModule, // 👈 добавляем
    BlockedSlotsModule,
    SettingsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
