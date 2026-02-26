// bookings/bookings.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Публичный эндпоинт (доступен без авторизации)
  @Get('available')
  @ApiQuery({ name: 'questId', required: true, type: Number })
  @ApiQuery({ name: 'date', required: true, example: '2025-06-15' })
  async getAvailableSlots(
    @Query('questId') questId: string,
    @Query('date') date: string,
  ) {
    return this.bookingsService.getAvailableSlots(+questId, date);
  }

  // Для авторизованных пользователей
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser() user: any,
  ) {
    return this.bookingsService.create(createBookingDto, user.userId);
  }

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async findMy(@CurrentUser() user: any) {
    return this.bookingsService.findByUser(user.userId);
  }

  // Админские эндпоинты
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async findAll() {
    return this.bookingsService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(+id);
  }



}
