import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateQuestDto } from './dto/create-quest.dto';
import { Quest } from './entitys/quest.entity';
import { MinioService } from '../images/minio.service';
import { UpdateQuestDto } from './dto/update-quest.dto';

@Injectable()
export class QuestsService {
  constructor(
    @InjectRepository(Quest)
    private questRepository: Repository<Quest>,
    private minioService: MinioService,
  ) {}

  async create(createQuestDto: CreateQuestDto): Promise<Quest> {
    const quest = this.questRepository.create(createQuestDto);

    return this.questRepository.save(quest);
  }
  async findAll(): Promise<Quest[]> {
    const quests = await this.questRepository.find();
    if (!quests) return [];

    await Promise.all(
      quests.map(async (quest) => {
        if (quest.images) {
          quest.images = await Promise.all(
            quest.images.map(async (url) => {
              const key = this.minioService.extractKeyFromUrl(url);
              if (key) {
                return await this.minioService.generatePresignedGetUrl(key);
              }
              return url;
            }),
          );
        }
      }),
    );
    return quests;
  }

  async findOne(id: number): Promise<Quest> {
    const quest = await this.questRepository.findOneBy({ id });
    if (!quest) throw new NotFoundException();

    if (quest.images && Array.isArray(quest.images)) {
      quest.images = await Promise.all(
        quest.images.map(async (url) => {
          const key = this.minioService.extractKeyFromUrl(url);
          if (key) {
            return await this.minioService.generatePresignedGetUrl(key);
          }
          return url;
        }),
      );
    }
    return quest;
  }

  async update(id: number, updateQuestDto: UpdateQuestDto): Promise<Quest> {
    const quest = await this.findOne(id);
    const oldImages = quest.images || [];

    // Обновляем данные
    Object.assign(quest, updateQuestDto);
    const updated = await this.questRepository.save(quest);

    // Удаляем изображения, которые были заменены (если новые переданы и старые не входят в новый массив)
    if (updateQuestDto.images) {
      if (Array.isArray(updateQuestDto.images)) {
        const toDelete = oldImages.filter((img) => {
          // @ts-ignore
          const { includes } = updateQuestDto.images;
          return !includes(img);
        });
        for (const imgUrl of toDelete) {
          const key = this.minioService.extractKeyFromUrl(imgUrl);
          if (key) {
            await this.minioService
              .deleteFile(key)
              .catch((err) => console.error('Delete failed', err));
          }
        }
      }
    }

    return updated;
  }

  async remove(id: number): Promise<void> {
    const quest = await this.findOne(id);
    // Удаляем все связанные изображения
    for (const imgUrl of quest.images || []) {
      const key = this.minioService.extractKeyFromUrl(imgUrl);
      if (key) {
        await this.minioService
          .deleteFile(key)
          .catch((err) => console.error('Delete failed', err));
      }
    }
    await this.questRepository.remove(quest);
  }
}
