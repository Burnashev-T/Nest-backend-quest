import { Module } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { BotService } from './bot.service';
import { BookingsModule } from '../bookings/bookings.module';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [BookingsModule, ScheduleModule],
  providers: [TelegramBotService, BotService],
})
export class BotModule {}
