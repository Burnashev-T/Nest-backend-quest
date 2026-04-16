import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
  UseGuards,
  Param,
  Delete,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MinioService } from './minio.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('images')
@Controller('images')
export class ImagesController {
  constructor(private readonly minioService: MinioService) {}

  @Post('upload')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Файл успешно загружен' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const key = `quests/cover/${fileName}`;

    await this.minioService.uploadFile(file, key);
    const url = await this.minioService.generatePresignedGetUrl(key);

    return { key, url };
  }

  @Get()
  @ApiOperation({
    summary: 'Получить список всех изображений (ключи + временные ссылки)',
  })
  @ApiResponse({ status: 200, description: 'Список объектов { key, url }' })
  async getAllImages() {
    const keys = await this.minioService.listObjects('quests/cover');
    const images = await Promise.all(
      keys.map(async (key) => ({
        key,
        url: await this.minioService.generatePresignedGetUrl(key),
      })),
    );
    return images;
  }

  // 1. Загрузка фото именно в галерею
  @Post('gallery/upload')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Файл успешно загружен' })
  async uploadToGallery(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const key = `quests/gallery/${fileName}`; // ← важно: gallery/

    await this.minioService.uploadFile(file, key);
    const url = await this.minioService.generatePresignedGetUrl(key, 86400); // 24 часа

    return { key, url };
  }

  // 2. Получение всех фото галереи
  @Get('gallery')
  async getGalleryImages() {
    const keys = await this.minioService.listObjects('quests/gallery/');

    const images = await Promise.all(
      keys.map(async (key) => ({
        key,
        url: await this.minioService.generatePresignedGetUrl(key),
      })),
    );

    return images;
  }

  // Удаление фото из галереи
  @Delete('gallery/delete')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async deleteGalleryImage(@Body('key') key: string) {
    if (!key) throw new BadRequestException('Key is required');

    // key должен приходить полностью: "quests/gallery/xxxx.jpg"
    await this.minioService.deleteFile(key);

    return { message: 'Фото успешно удалено из галереи' };
  }
}
