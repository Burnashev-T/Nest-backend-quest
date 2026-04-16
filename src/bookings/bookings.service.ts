import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Quest } from '../quests-module/entitys/quest.entity';
import { BlockedSlotsService } from '../blocked-slots/blocked-slots.service';
import { SettingsService } from '../settings/settings.service';
import { BookingStatus } from './entities/booking-enum.entity';
import { Service } from '../services-module/entitys/services.entity';
import { TelegramService } from '../telegram/telegram/telegram.service';
import { ScheduleService } from '../schedule/schedule.service';

const MIN_DEPOSIT = 1500;

@Injectable()
class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Quest)
    private questRepository: Repository<Quest>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    private blockedSlotsService: BlockedSlotsService,
    private settingsService: SettingsService,
    private telegramService: TelegramService,
    private scheduleService: ScheduleService,
    private dataSource: DataSource,
  ) {}

  // --- Вспомогательные методы ---
  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private intervalsOverlap(
    s1: number,
    e1: number,
    s2: number,
    e2: number,
  ): boolean {
    return Math.max(s1, s2) < Math.min(e1, e2);
  }

  // --- Получение глобальных настроек ---
  private async getScheduleSettings() {
    const normalStart = await this.settingsService
      .getValue('NORMAL_HOURS_START')
      .catch(() => '10');
    const normalEnd = await this.settingsService
      .getValue('NORMAL_HOURS_END')
      .catch(() => '22');

    return {
      normal: {
        start: this.timeToMinutes(normalStart),
        end: this.timeToMinutes(normalEnd),
      },
    };
  }

  // --- Проверка доступности слота ---
  async isTimeSlotAvailable(
    questId: number,
    date: string,
    start: string,
    end: string,
  ): Promise<boolean> {
    const startM = this.timeToMinutes(start);
    const endM = this.timeToMinutes(end);

    const bookings = await this.bookingRepository.find({
      where: {
        // quest: { id: questId }, это не нужно для бронирования 2х квестов на одно и тоже время!
        date,
        status: In([
          BookingStatus.PENDING,
          BookingStatus.DEPOSIT_PAID,
          BookingStatus.CONFIRMED,
        ]),
      },
    });
    for (const b of bookings) {
      const bStart = this.timeToMinutes(b.startTime);
      const bEnd = this.timeToMinutes(b.endTime);
      if (this.intervalsOverlap(startM, endM, bStart, bEnd)) return false;
    }

    const blocked = await this.blockedSlotsService.findByQuestAndDate(
      questId,
      date,
    );
    for (const b of blocked) {
      const bStart = this.timeToMinutes(b.startTime);
      const bEnd = this.timeToMinutes(b.endTime);
      if (this.intervalsOverlap(startM, endM, bStart, bEnd)) return false;
    }

    return true;
  }
  // --- Получение свободных интервалов ---
  async getAvailableSlots(
    questId: number,
    date: string,
  ): Promise<{ start: string; end: string }[]> {
    const settings = await this.getScheduleSettings();
    const dayStart = settings.normal.start;
    const dayEnd = settings.normal.end;

    const bookings = await this.bookingRepository.find({
      where: {
        // quest: { id: questId }, это не нужно для бронирование 2х квестов на одно и тоже время!
        date,
        status: In([
          BookingStatus.PENDING,
          BookingStatus.DEPOSIT_PAID,
          BookingStatus.CONFIRMED,
        ]),
      },
      order: { startTime: 'ASC' },
    });
    const blocked = await this.blockedSlotsService.findByQuestAndDate(
      questId,
      date,
    );

    const busyIntervals = [
      ...bookings.map((b) => ({
        start: this.timeToMinutes(b.startTime),
        end: this.timeToMinutes(b.endTime),
      })),
      ...blocked.map((b) => ({
        start: this.timeToMinutes(b.startTime),
        end: this.timeToMinutes(b.endTime),
      })),
    ];
    busyIntervals.sort((a, b) => a.start - b.start);

    const freeSlots: { start: string; end: string }[] = [];
    let current = dayStart;
    for (const busy of busyIntervals) {
      if (current < busy.start) {
        freeSlots.push({
          start: this.minutesToTime(current),
          end: this.minutesToTime(busy.start),
        });
      }
      current = Math.max(current, busy.end);
    }
    if (current < dayEnd) {
      freeSlots.push({
        start: this.minutesToTime(current),
        end: this.minutesToTime(dayEnd),
      });
    }
    return freeSlots;
  }

  // --- Создание брони администратором ---
  async create(createDto: CreateBookingDto, adminId: number): Promise<Booking> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const quest = await queryRunner.manager.findOne(Quest, {
        where: { id: createDto.questId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!quest) throw new NotFoundException('Квест не найден');
      if (!quest.isActive) throw new BadRequestException('Квест не активен');

      // Проверка даты и времени
      const today = new Date().toISOString().split('T')[0];
      if (createDto.date < today) {
        throw new BadRequestException('Нельзя создать бронь на прошедшую дату');
      }

      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      if (createDto.date === currentDate) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startM = this.timeToMinutes(createDto.startTime);
        const minLeadMinutes = 3 * 60;
        if (startM < currentMinutes + minLeadMinutes) {
          throw new BadRequestException(
            `Для сегодняшней даты время начала должно быть не ранее ${this.minutesToTime(currentMinutes + minLeadMinutes)}`,
          );
        }
      }

      // Проверка пересечения времени
      const startM = this.timeToMinutes(createDto.startTime);
      const endM = this.timeToMinutes(createDto.endTime);
      const durationMinutes = endM - startM;
      const hours = Math.ceil(durationMinutes / 60);

      if (durationMinutes <= 0) {
        throw new BadRequestException(
          'Время окончания должно быть позже времени начала',
        );
      }

      // === НОВАЯ ЛОГИКА РАСЧЁТА СТОИМОСТИ ===
      let basePrice = 0;

      if (hours === 1) {
        if (createDto.childrenCount <= 4) {
          basePrice = 5000;
        } else {
          basePrice = 5000 + (createDto.childrenCount - 4) * 1000;
        }
      } else if (hours === 2) {
        basePrice = 10000; // до 10 человек
      } else if (hours === 3) {
        basePrice = 15000; // до 10 человек
      } else {
        // fallback для других длительностей
        basePrice = hours * 5000;
      }

      // Дополнительные услуги
      let services: Service[] = [];
      let servicesPrice = 0;
      if (createDto.serviceIds?.length) {
        services = await this.serviceRepository.findBy({
          id: In(createDto.serviceIds),
          isActive: true,
        });
        servicesPrice = services.reduce((sum, s) => sum + Number(s.price), 0);
      }

      const finalTotal = basePrice + servicesPrice;
      const finalDeposit = Math.max(
        MIN_DEPOSIT,
        Number(quest.depositPerHour || 1500),
      );

      // Проверка доступности слота (остаётся как было)
      const available = await this.isTimeSlotAvailable(
        quest.id,
        createDto.date,
        createDto.startTime,
        createDto.endTime,
      );

      if (!available) {
        throw new BadRequestException('Выбранное время недоступно');
      }

      // Создание брони
      const booking = queryRunner.manager.create(Booking, {
        clientName: createDto.clientName,
        clientPhone: createDto.clientPhone,
        quest,
        date: createDto.date,
        startTime: createDto.startTime,
        endTime: createDto.endTime,
        childrenCount: createDto.childrenCount,
        comment: createDto.comment,
        services,
        totalPrice: finalTotal,
        totalDeposit: finalDeposit,
        status: BookingStatus.CONFIRMED,
        createdByAdminId: adminId,
      });

      const savedBooking = await queryRunner.manager.save(booking);

      await this.scheduleService.upsertFromBooking(savedBooking);

      await this.telegramService.sendMessage(
        `🆕 Новая бронь!\nКлиент: ${createDto.clientName}\nТелефон: ${createDto.clientPhone}\nКвест: ${quest.title}\nДата: ${createDto.date}\nВремя: ${createDto.startTime} - ${createDto.endTime}\nДетей: ${createDto.childrenCount}\nСумма: ${finalTotal} руб. (предоплата: ${finalDeposit})`,
      );

      await queryRunner.commitTransaction();
      return savedBooking;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
  // --- Получение всех броней (для админа) ---
  async findAll(): Promise<Booking[]> {
    return this.bookingRepository.find({ relations: ['quest', 'services'] });
  }

  // --- Получение брони по ID ---
  async findOne(id: number): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['quest', 'services'],
    });
    if (!booking) throw new NotFoundException('Бронь не найдена');
    return booking;
  }

  // --- Подтверждение брони (админ) ---
  async confirm(id: number): Promise<Booking> {
    const booking = await this.findOne(id);
    if (booking.status !== BookingStatus.DEPOSIT_PAID) {
      throw new BadRequestException(
        'Нельзя подтвердить бронь без оплаченной предоплаты',
      );
    }
    booking.status = BookingStatus.CONFIRMED;
    return this.bookingRepository.save(booking);
  }

  // --- Отмена брони (админ) ---
  async cancel(id: number): Promise<Booking> {
    const booking = await this.findOne(id);
    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException('Бронь уже отменена или завершена');
    }
    booking.status = BookingStatus.CANCELLED;
    await this.scheduleService.deleteByBooking(booking);
    return this.bookingRepository.save(booking);
  }

  // --- Завершение брони ---
  async complete(id: number): Promise<Booking> {
    const booking = await this.findOne(id);
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Только подтверждённые брони можно завершить',
      );
    }
    booking.status = BookingStatus.COMPLETED;
    return this.bookingRepository.save(booking);
  }

  // --- Статистика (опционально) ---
  async getStats() {
    const total = await this.bookingRepository.count();
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = await this.bookingRepository.count({
      where: { date: today },
    });
    const totalRevenue = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.totalDeposit)', 'sum')
      .where('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.DEPOSIT_PAID, BookingStatus.CONFIRMED],
      })
      .getRawOne();
    return { total, todayBookings, totalRevenue: totalRevenue.sum || 0 };
  }
  async countByQuestId(questId: number): Promise<number> {
    return this.bookingRepository.count({ where: { quest: { id: questId } } });
  }

  async updateTime(
    id: number,
    startTime: string,
    endTime: string,
  ): Promise<Booking> {
    const booking = await this.findOne(id);
    // Дополнительно проверьте доступность нового времени
    const available = await this.isTimeSlotAvailable(
      booking.quest.id,
      booking.date,
      startTime,
      endTime,
    );
    if (!available) throw new BadRequestException('Новое время недоступно');
    booking.startTime = startTime;
    booking.endTime = endTime;
    return this.bookingRepository.save(booking);
  }

  async findByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Booking[]> {
    return this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.date BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
      })
      .leftJoinAndSelect('booking.quest', 'quest')
      .orderBy('booking.date', 'ASC')
      .getMany();
  }
}

export default BookingsService;
