import { Injectable } from '@nestjs/common';
import BookingsService from '../bookings/bookings.service';
import { ScheduleEvent } from '../schedule/entities/schedule-event.entity';
import { ScheduleService } from '../schedule/schedule.service';

@Injectable()
export class BotService {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly scheduleService: ScheduleService,
  ) {}

  async getTodaysBookings() {
    const today = new Date().toISOString().split('T')[0];
    return this.bookingsService.findByDateRange(today, today);
  }

  async getWeekBookings() {
    const today = new Date();
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 6);
    return this.bookingsService.findByDateRange(
      today.toISOString().split('T')[0],
      endOfWeek.toISOString().split('T')[0],
    );
  }

  async getMonthBookings() {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return this.bookingsService.findByDateRange(
      today.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0],
    );
  }

  formatBookings(bookings: any[]): string {
    if (!bookings.length) return 'Нет броней на этот период.';
    return bookings
      .map(
        (b) =>
          `🎭 *${b.quest.title}*\n📅 ${b.date} ${b.startTime}-${b.endTime}\n👤 ${b.clientName}\n📞 ${b.clientPhone}`,
      )
      .join('\n\n');
  }
  async getEventsForDateRange(
    startDate: string,
    endDate: string,
  ): Promise<ScheduleEvent[]> {
    return this.scheduleService.findByDateRange(startDate, endDate);
  }
}
