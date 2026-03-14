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

@Injectable()
export class BlockedSlotsService {
  constructor(
    @InjectRepository(BlockedSlot)
    private blockedSlotRepository: Repository<BlockedSlot>,
    @InjectRepository(Quest)
    private questRepository: Repository<Quest>,
  ) {}

  async create(createDto: CreateBlockedSlotDto): Promise<BlockedSlot> {
    // Проверка на существование аналогичной блокировки
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
