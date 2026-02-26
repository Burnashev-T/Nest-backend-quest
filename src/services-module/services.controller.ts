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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

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

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiResponse({ status: 201, description: 'Услуга создана', type: Service })
  async create(@Body() createDto: CreateServiceDto): Promise<Service> {
    return this.servicesService.create(createDto);
  }

  @Patch(':id')
  @ApiResponse({ status: 200, description: 'Услуга обновлена', type: Service })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceDto,
  ): Promise<Service> {
    return this.servicesService.update(+id, updateDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiResponse({ status: 200, description: 'Услуга удалена' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.servicesService.remove(+id);
  }
}
