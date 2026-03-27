// bookings/bookings.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Quest } from '../quests-module/entitys/quest.entity';
import { BlockedSlotsService } from '../blocked-slots/blocked-slots.service';
import { SettingsService } from '../settings/settings.service';
import { BookingStatus } from './entities/booking-enum.entity';
import { Service } from '../services-module/entitys/services.entity';
import { UsersService } from '../users/users.service';
import { AdminCreateBookingDto } from './dto/admin-create-booking.dto';

const MIN_DEPOSIT = 1500; // минимальная предоплата
const MIN_LEAD_HOURS = 6; // минимальное количество часов до начала брони

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Quest)
    private questRepository: Repository<Quest>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    private blockedSlotsService: BlockedSlotsService,
    private settingsService: SettingsService,
    private usersService: UsersService,
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
  private getCurrentMinutes(): number {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  private getCurrentDateString(): string {
    return new Date().toISOString().split('T')[0];
  }
  // --- Получение глобальных настроек ---
  private async getScheduleSettings() {
    // Значения по умолчанию, если настройки ещё не заданы
    const earlyStart = await this.settingsService
      .getValue('EARLY_HOURS_START')
      .catch(() => '7');
    const earlyEnd = await this.settingsService
      .getValue('EARLY_HOURS_END')
      .catch(() => '9');
    const earlySurcharge = await this.settingsService
      .getValue('EARLY_SURCHARGE')
      .catch(() => '2000');
    const lateStart = await this.settingsService
      .getValue('LATE_HOURS_START')
      .catch(() => '22');
    const lateEnd = await this.settingsService
      .getValue('LATE_HOURS_END')
      .catch(() => '24');
    const lateSurcharge = await this.settingsService
      .getValue('LATE_SURCHARGE')
      .catch(() => '2000');
    const normalStart = await this.settingsService
      .getValue('NORMAL_HOURS_START')
      .catch(() => '10');
    const normalEnd = await this.settingsService
      .getValue('NORMAL_HOURS_END')
      .catch(() => '21');

    return {
      early: {
        start: this.timeToMinutes(earlyStart),
        end: this.timeToMinutes(earlyEnd),
        surcharge: Number(earlySurcharge),
      },
      late: {
        start: this.timeToMinutes(lateStart),
        end: this.timeToMinutes(lateEnd),
        surcharge: Number(lateSurcharge),
      },
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
    console.log(
      `isTimeSlotAvailable: date=${date}, start=${start} (${startM}), end=${end} (${endM})`,
    );

    // Проверка броней
    const bookings = await this.bookingRepository.find({
      where: {
        date,
        status: In([
          BookingStatus.PENDING,
          BookingStatus.DEPOSIT_PAID,
          BookingStatus.CONFIRMED,
        ]),
      },
    });
    console.log(
      'Active bookings:',
      bookings.map((b) => `${b.startTime}-${b.endTime}`),
    );
    for (const b of bookings) {
      const bStart = this.timeToMinutes(b.startTime);
      const bEnd = this.timeToMinutes(b.endTime);
      if (this.intervalsOverlap(startM, endM, bStart, bEnd)) {
        console.log('Overlap with booking', b.id);
        return false;
      }
    }

    // Проверка блокировок
    const blocked = await this.blockedSlotsService.findByQuestAndDate(
      questId,
      date,
    );
    console.log(
      'Blocked intervals:',
      blocked.map((b) => `${b.startTime}-${b.endTime}`),
    );
    for (const b of blocked) {
      const bStart = this.timeToMinutes(b.startTime);
      const bEnd = this.timeToMinutes(b.endTime);
      console.log(
        `Checking blocked: ${b.startTime} (${bStart})-${b.endTime} (${bEnd})`,
      );
      if (this.intervalsOverlap(startM, endM, bStart, bEnd)) {
        console.log('OVERLAP with blocked slot', b.id);
        return false;
      }
    }

    console.log('Time slot is available');
    return true;
  }
  async getAvailableSlots(
    questId: number,
    date: string,
  ): Promise<{ start: string; end: string }[]> {
    const settings = await this.getScheduleSettings();
    const dayStart = settings.normal.start;
    const dayEnd = settings.normal.end;
    // Получаем все блокировки на эту дату
    const allBlocked = await this.blockedSlotsService.findByDate(date);
    // Фильтруем: оставляем либо глобальные (quest === null), либо для этого квеста
    const relevantBlocked = allBlocked.filter(
      (b) => !b.quest || b.quest.id === questId,
    );
    // Все брони на дату
    const bookings = await this.bookingRepository.find({
      where: {
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
    console.log('Blocked intervals for availability:', blocked);
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
  // --- Создание брони ---
  async create(
    createBookingDto: CreateBookingDto,
    userId: number = 1,
  ): Promise<Booking> {
    const quest = await this.questRepository.findOneBy({
      id: createBookingDto.questId,
    });
    if (!quest) throw new NotFoundException('Квест не найден');
    if (!quest.isActive)
      throw new BadRequestException(
        'Квест не активен или больше не проводиться',
      );

    // Проверка на активные брони пользователя
    const activeBookings = await this.bookingRepository.find({
      where: {
        userId,
        status: In([
          BookingStatus.PENDING,
          BookingStatus.DEPOSIT_PAID,
          BookingStatus.CONFIRMED,
        ]),
      },
    });
    if (activeBookings.length > 0) {
      throw new BadRequestException(
        'У вас уже есть активная бронь. Дождитесь её завершения или отмените её, чтобы создать новую.',
      );
    }

    // Преобразуем время в минуты
    const startM = this.timeToMinutes(createBookingDto.startTime);
    const endM = this.timeToMinutes(createBookingDto.endTime);
    if (endM <= startM) {
      throw new BadRequestException(
        'Время окончания должно быть позже времени начала',
      );
    }

    // Проверка доступности
    const available = await this.isTimeSlotAvailable(
      quest.id,
      createBookingDto.date,
      createBookingDto.startTime,
      createBookingDto.endTime,
    );
    if (!available) {
      throw new BadRequestException('Выбранное время недоступно');
    }

    const childrenCount = createBookingDto.childrenCount;

    // Базовая ставка для 4 человек
    let hourlyRate = Number(quest.basePricePerHour);
    if (childrenCount > 4) {
      const extraPeople = childrenCount - 4;
      hourlyRate += extraPeople * Number(quest.extraPlayerPrice);
    }

    // Расчёт длительности в часах (округляем вверх)
    const durationMinutes = endM - startM;
    const hours = Math.ceil(durationMinutes / 60);

    const maxHoursForUser = 3;
    const user = await this.usersService.findById(userId);
    if (user && user.role === 'user' && hours > maxHoursForUser) {
      throw new BadRequestException(
        `Максимальная длительность брони для обычных пользователей — ${maxHoursForUser} часа. Для бронирования более длительных мероприятий обратитесь к администратору или внесите предоплату.`,
      );
    }
    // Стоимость квеста (без учёта доплат за время)
    const totalQuestPrice = hourlyRate + hours;

    // Доплата за ранние/поздние часы
    const settings = await this.getScheduleSettings();
    let surcharge = 0;
    for (let t = startM; t < endM; t++) {
      if (t >= settings.early.start && t < settings.early.end) {
        surcharge += settings.early.surcharge / 60;
      } else if (t >= settings.late.start && t < settings.late.end) {
        surcharge += settings.late.surcharge / 60;
      }
    }
    const totalSurcharge = Math.round(surcharge);
    const finalQuestPrice = totalQuestPrice + totalSurcharge; // полная стоимость квеста

    // Предоплата
    const deposit = Math.max(MIN_DEPOSIT, Number(quest.depositPerHour) * hours);

    // Получение услуг
    let services: Service[] = [];
    let servicesPrice = 0;
    if (createBookingDto.serviceIds?.length) {
      services = await this.serviceRepository.findBy({
        id: In(createBookingDto.serviceIds),
        isActive: true,
      });
      servicesPrice = services.reduce((sum, s) => sum + Number(s.price), 0);
    }

    const finalTotal = finalQuestPrice + servicesPrice; // полная стоимость мероприятия
    const finalDeposit = deposit; // услуги не входят в предоплату

    const booking = this.bookingRepository.create({
      userId,
      quest,
      date: createBookingDto.date,
      startTime: createBookingDto.startTime,
      endTime: createBookingDto.endTime,
      childrenCount,
      comment: createBookingDto.comment,
      services,
      totalPrice: finalTotal,
      totalDeposit: finalDeposit,
      status: BookingStatus.PENDING,
    });

    return this.bookingRepository.save(booking);
  }
  // --- Получение всех броней (для админа) ---
  async findAll(): Promise<Booking[]> {
    return this.bookingRepository.find({ relations: ['quest', 'services'] });
  }

  async cancel(id: number): Promise<Booking> {
    const booking = await this.findOne(id);
    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException('Бронь уже отменена или завершена');
    }
    booking.status = BookingStatus.CANCELLED;
    return this.bookingRepository.save(booking);
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

  // --- Получение броней конкретного пользователя ---
  async findByUser(userId: number): Promise<Booking[]> {
    return this.bookingRepository.find({
      where: { userId },
      relations: ['quest', 'services'],
    });
  }

  async getStats() {
    const total = await this.bookingRepository.count();
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = await this.bookingRepository.count({
      where: { date: today },
    });
    const totalRevenue = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.totalDeposit)', 'sum')
      .where('booking.status = :status', { status: BookingStatus.DEPOSIT_PAID })
      .orWhere('booking.status = :confirmed', {
        confirmed: BookingStatus.CONFIRMED,
      })
      .getRawOne();
    return { total, todayBookings, totalRevenue: totalRevenue.sum || 0 };
  }

  async adminCreate(
    createDto: AdminCreateBookingDto,
    adminId: number,
  ): Promise<Booking> {
    // Проверка пользователя
    const user = await this.usersService.findById(createDto.userId);
    if (!user) throw new NotFoundException('Пользователь не найден');

    const quest = await this.questRepository.findOneBy({
      id: createDto.questId,
    });
    if (!quest) throw new NotFoundException('Квест не найден');
    if (!quest.isActive) throw new BadRequestException('Квест не активен');

    const startM = this.timeToMinutes(createDto.startTime);
    const endM = this.timeToMinutes(createDto.endTime);
    if (endM <= startM) {
      throw new BadRequestException(
        'Время окончания должно быть позже времени начала',
      );
    }

    // Проверка доступности
    const available = await this.isTimeSlotAvailable(
      quest.id,
      createDto.date,
      createDto.startTime,
      createDto.endTime,
    );
    if (!available) throw new BadRequestException('Выбранное время недоступно');

    const childrenCount = createDto.childrenCount;

    let hourlyRate = Number(quest.basePricePerHour);
    if (childrenCount > 4) {
      const extraPeople = childrenCount - 4;
      hourlyRate += extraPeople * Number(quest.extraPlayerPrice);
    }

    const durationMinutes = endM - startM;
    const hours = Math.ceil(durationMinutes / 60);
    const totalQuestPrice = hourlyRate * hours;

    // Доплата за ранние/поздние часы
    const settings = await this.getScheduleSettings();
    let surcharge = 0;
    for (let t = startM; t < endM; t++) {
      if (t >= settings.early.start && t < settings.early.end) {
        surcharge += settings.early.surcharge / 60;
      } else if (t >= settings.late.start && t < settings.late.end) {
        surcharge += settings.late.surcharge / 60;
      }
    }
    const totalSurcharge = Math.round(surcharge);
    const finalQuestPrice = totalQuestPrice + totalSurcharge;

    const deposit = Math.max(1500, Number(quest.depositPerHour) * hours);

    let services: Service[] = [];
    let servicesPrice = 0;
    if (createDto.serviceIds?.length) {
      services = await this.serviceRepository.findBy({
        id: In(createDto.serviceIds),
        isActive: true,
      });
      servicesPrice = services.reduce((sum, s) => sum + Number(s.price), 0);
    }

    const finalTotal = finalQuestPrice + servicesPrice;
    const finalDeposit = deposit;

    const booking = this.bookingRepository.create({
      userId: createDto.userId,
      quest,
      date: createDto.date,
      startTime: createDto.startTime,
      endTime: createDto.endTime,
      childrenCount,
      comment: createDto.comment,
      services,
      totalPrice: finalTotal,
      totalDeposit: finalDeposit,
      status: BookingStatus.AWAITING_CLIENT_CONFIRMATION,
    });

    return this.bookingRepository.save(booking);
  }
  async confirmByClient(bookingId: number, userId: number): Promise<Booking> {
    const booking = await this.findOne(bookingId);
    if (booking.userId !== userId) {
      throw new ForbiddenException('Вы не можете подтвердить чужую бронь');
    }
    if (booking.status !== BookingStatus.AWAITING_CLIENT_CONFIRMATION) {
      throw new BadRequestException('Эта бронь не ожидает подтверждения');
    }
    booking.status = BookingStatus.PENDING;
    return this.bookingRepository.save(booking);
  }
}
