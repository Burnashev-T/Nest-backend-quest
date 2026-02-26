import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
  ) {}

  async create(createDto: CreateSettingDto): Promise<Setting> {
    const setting = this.settingsRepository.create(createDto);
    return this.settingsRepository.save(setting);
  }

  async findAll(): Promise<Setting[]> {
    return this.settingsRepository.find();
  }

  async findOne(key: string): Promise<Setting> {
    const setting = await this.settingsRepository.findOneBy({ key });
    if (!setting)
      throw new NotFoundException(`Setting with key "${key}" not found`);
    return setting;
  }

  async getValue(key: string): Promise<string> {
    const setting = await this.findOne(key);
    return setting.value;
  }

  async update(key: string, updateDto: UpdateSettingDto): Promise<Setting> {
    const setting = await this.findOne(key);
    Object.assign(setting, updateDto);
    return this.settingsRepository.save(setting);
  }

  async remove(key: string): Promise<void> {
    const result = await this.settingsRepository.delete({ key });
    if (result.affected === 0)
      throw new NotFoundException(`Setting with key "${key}" not found`);
  }
}
