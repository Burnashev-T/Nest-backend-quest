import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  MoreThanOrEqual,
  LessThan,
  Between,
  Not,
  IsNull,
} from 'typeorm';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { BookingStatus } from '../bookings/entities/booking-enum.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(ScheduleEvent)
    private eventRepository: Repository<ScheduleEvent>,
  ) {}

  async getUpcomingEvents(): Promise<ScheduleEvent[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.eventRepository.find({
      where: { date: MoreThanOrEqual(today) },
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async deleteByBooking(booking: any): Promise<void> {
    await this.eventRepository.delete({
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      questTitle: booking.quest.title,
    });
  }

  async upsertFromBooking(booking: any): Promise<void> {
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED
    )
      return;
    const existing = await this.eventRepository.findOne({
      where: {
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        questTitle: booking.quest.title,
      },
    });
    if (existing) return;
    const event = this.eventRepository.create({
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      questTitle: booking.quest.title,
      rolesDescription: null,
    });
    await this.eventRepository.save(event);
  }

  async updateRoles(id: number, rolesDescription: string): Promise<void> {
    const cleaned = rolesDescription
      .split('\n')
      .map((line) => line.trim())
      .join('\n');
    await this.eventRepository.update(id, { rolesDescription: cleaned });
  }

  async findByBooking(booking: any): Promise<ScheduleEvent | null> {
    return this.eventRepository.findOne({
      where: {
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        questTitle: booking.quest.title,
      },
    });
  }
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async deleteOldEvents() {
    const today = new Date().toISOString().split('T')[0];
    await this.eventRepository.delete({ date: LessThan(today) });
  }

  async findByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<ScheduleEvent[]> {
    return this.eventRepository.find({
      where: { date: Between(startDate, endDate) },
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }
  async getUpcomingEventsWithRoles(): Promise<ScheduleEvent[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.eventRepository.find({
      where: {
        date: MoreThanOrEqual(today),
        rolesDescription: Not(IsNull()), // только те, у которых есть роли
      },
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }
}
