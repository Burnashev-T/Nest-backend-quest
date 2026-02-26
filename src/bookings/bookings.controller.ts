// bookings/bookings.controller.ts
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('available')
  @ApiQuery({ name: 'questId', required: true, type: Number })
  @ApiQuery({ name: 'date', required: true, example: '2025-06-15' })
  async getAvailableSlots(
    @Query('questId') questId: string,
    @Query('date') date: string,
  ) {
    return this.bookingsService.getAvailableSlots(+questId, date);
  }

  @Post()
  create(@Body() createBookingDto: CreateBookingDto) {
    // TODO: получить userId из JWT
    return this.bookingsService.create(createBookingDto, 1);
  }

  @Get()
  findAll() {
    return this.bookingsService.findAll();
  }

  @Get('my')
  findMy() {
    // TODO: получить userId из JWT
    return this.bookingsService.findByUser(1);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(+id);
  }
}
