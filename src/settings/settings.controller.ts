// settings/settings.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('settings')
@Controller('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN) // только суперадмин
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Post()
  async create(@Body() createDto: CreateSettingDto) {
    return this.settingsService.create(createDto);
  }

  @Get()
  async findAll() {
    return this.settingsService.findAll();
  }

  @Get(':key')
  async findOne(@Param('key') key: string) {
    return this.settingsService.findOne(key);
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Patch(':key')
  async update(@Param('key') key: string, @Body() updateDto: UpdateSettingDto) {
    return this.settingsService.update(key, updateDto);
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Delete(':key')
  async remove(@Param('key') key: string) {
    return this.settingsService.remove(key);
  }
}
