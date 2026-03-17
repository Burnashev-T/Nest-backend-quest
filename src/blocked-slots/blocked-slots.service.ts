import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BlockedSlot } from './entities/blocked-slot.entity';
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto';
import { UpdateBlockedSlotDto } from './dto/update-blocked-slot.dto';
import { Quest } from '../quests-module/entitys/quest.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '../bookings/entities/booking-enum.entity';

@Injectable()
export class BlockedSlotsService {
  constructor(
    @InjectRepository(BlockedSlot)
    private blockedSlotRepository: Repository<BlockedSlot>,
    @InjectRepository(Quest)
    private questRepository: Repository<Quest>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async deleteOldBlockedSlots(days: number = 14): Promise<number> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);
    const thresholdDateStr = thresholdDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const result = await this.blockedSlotRepository
      .createQueryBuilder()
      .delete()
      .where('date <= :thresholdDate', { thresholdDate: thresholdDateStr })
      .execute();
    return result.affected || 0;
  }

  async create(createDto: CreateBlockedSlotDto): Promise<BlockedSlot> {
    // 1. Удаляем старые блокировки
    await this.deleteOldBlockedSlots();

    // 2. Проверка на дубликат
    const existing = await this.blockedSlotRepository.findOne({
      where: {
        quest: createDto.questId ? { id: createDto.questId } : IsNull(),
        date: createDto.date,
        startTime: createDto.startTime,
        endTime: createDto.endTime,
      },
    });
    if (existing) {
      throw new BadRequestException('Такая блокировка уже существует');
    }

    // 3. Проверка на активные брони на этот интервал
    const activeBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.date = :date', { date: createDto.date })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [
          BookingStatus.PENDING,
          BookingStatus.DEPOSIT_PAID,
          BookingStatus.CONFIRMED,
        ],
      })
      .andWhere('(booking.startTime < :end AND booking.endTime > :start)', {
        start: createDto.startTime,
        end: createDto.endTime,
      })
      .getMany();

    if (activeBookings.length > 0) {
      throw new BadRequestException(
        'Невозможно создать блокировку: на это время уже есть бронирования',
      );
    }

    let quest: Quest | null = null;
    if (createDto.questId) {
      quest = await this.questRepository.findOneBy({ id: createDto.questId });
      if (!quest) throw new NotFoundException('Квест не найден');
    }

    const slot = this.blockedSlotRepository.create({
      quest,
      date: createDto.date,
      startTime: createDto.startTime,
      endTime: createDto.endTime,
      reason: createDto.reason,
    });
    return this.blockedSlotRepository.save(slot);
  }

  async findAll(): Promise<BlockedSlot[]> {
    return this.blockedSlotRepository.find({ relations: ['quest'] });
  }

  async findByDate(date: string): Promise<BlockedSlot[]> {
    return this.blockedSlotRepository.find({
      where: { date },
      relations: ['quest'],
    });
  }

  async findOne(id: number): Promise<BlockedSlot> {
    const slot = await this.blockedSlotRepository.findOne({
      where: { id },
      relations: ['quest'],
    });
    if (!slot) throw new NotFoundException('Блокировка не найдена');
    return slot;
  }

  async findByQuestAndDate(
    questId: number,
    date: string,
  ): Promise<BlockedSlot[]> {
    console.log('findByQuestAndDate called with:', { questId, date });
    const result = await this.blockedSlotRepository.find({
      where: [
        { quest: { id: questId }, date },
        { quest: IsNull(), date },
      ],
      relations: ['quest'],
    });
    console.log('findByQuestAndDate result:', result);
    return result;
  }

  async update(
    id: number,
    updateDto: UpdateBlockedSlotDto,
  ): Promise<BlockedSlot> {
    const slot = await this.findOne(id);
    Object.assign(slot, updateDto);
    return this.blockedSlotRepository.save(slot);
  }

  async remove(id: number): Promise<void> {
    const result = await this.blockedSlotRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Блокировка не найдена');
  }
}
