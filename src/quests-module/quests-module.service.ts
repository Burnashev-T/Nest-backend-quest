import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateQuestDto } from './dto/create-quest.dto';
import { Quest } from './entitys/quest.entity';
import { MinioService } from '../images/minio.service';
import { UpdateQuestDto } from './dto/update-quest.dto';
import BookingsService from '../bookings/bookings.service';

@Injectable()
export class QuestsService {
  constructor(
    @InjectRepository(Quest)
    private questRepository: Repository<Quest>,
    private bookingsService: BookingsService,
    private minioService: MinioService,
  ) {}

  async create(createQuestDto: CreateQuestDto): Promise<Quest> {
    const quest = this.questRepository.create(createQuestDto);
    return this.questRepository.save(quest);
  }

  async findAll(): Promise<any[]> {
    const quests = await this.questRepository.find();
    return Promise.all(
      quests.map(async (quest) => ({
        ...quest,
        images: await Promise.all(
          (quest.images || []).map(async (key) => ({
            key,
            url: await this.minioService.generatePresignedGetUrl(key),
          })),
        ),
      })),
    );
  }

  async findOne(id: number): Promise<any> {
    const quest = await this.questRepository.findOneBy({ id });
    if (!quest) throw new NotFoundException();

    // Создаём массив объектов { key, url }
    const images = await Promise.all(
      (quest.images || []).map(async (key) => ({
        key,
        url: await this.minioService.generatePresignedGetUrl(key),
      })),
    );

    // Возвращаем квест с заменённым полем images
    return { ...quest, images };
  }

  async update(id: number, updateQuestDto: UpdateQuestDto): Promise<Quest> {
    const quest = await this.findOne(id);
    const oldImageKeys = quest.images || [];

    Object.assign(quest, updateQuestDto);
    const updated = await this.questRepository.save(quest);

    const newImageKeys = updateQuestDto.images;
    if (newImageKeys && Array.isArray(newImageKeys)) {
      const toDelete = oldImageKeys.filter(
        (key) => !newImageKeys.includes(key),
      );
      for (const key of toDelete) {
        await this.minioService
          .deleteFile(key)
          .catch((err) => console.error('Delete failed', err));
      }
    }
    return updated;
  }

  async remove(id: number): Promise<void> {
    const quest = await this.findOne(id);
    const bookingsCount = await this.bookingsService.countByQuestId(id);
    if (bookingsCount > 0) {
      throw new BadRequestException(
        'Нельзя удалить квест, на который есть бронирования',
      );
    }
    // Удаляем изображения
    for (const img of quest.images || []) {
      let key: string | null = null;
      if (typeof img === 'string') {
        key = img;
      } else if (img && typeof img === 'object' && 'key' in img) {
        key = img.key;
      }
      if (key) {
        await this.minioService
          .deleteFile(key)
          .catch((err) => console.error('Delete failed', err));
      }
    }
    await this.questRepository.remove(quest);
  }
}
