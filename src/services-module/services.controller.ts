// services-module/services.controller.ts
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
import { ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entitys/services.entity';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiResponse({ status: 201, description: 'Услуга создана', type: Service })
  async create(@Body() createDto: CreateServiceDto): Promise<Service> {
    return this.servicesService.create(createDto);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Список услуг', type: [Service] })
  async findAll(): Promise<Service[]> {
    return this.servicesService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Услуга найдена', type: Service })
  @ApiResponse({ status: 404, description: 'Услуга не найдена' })
  async findOne(@Param('id') id: string): Promise<Service> {
    return this.servicesService.findOne(+id);
  }

  @Patch(':id')
  @ApiResponse({ status: 200, description: 'Услуга обновлена', type: Service })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceDto,
  ): Promise<Service> {
    return this.servicesService.update(+id, updateDto);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'Услуга удалена' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.servicesService.remove(+id);
  }
}
