// blocked-slots/blocked-slots.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BlockedSlotsService } from './blocked-slots.service';
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto';
import { UpdateBlockedSlotDto } from './dto/update-blocked-slot.dto';

@ApiTags('blocked-slots')
@Controller('blocked-slots')
export class BlockedSlotsController {
  constructor(private readonly blockedSlotsService: BlockedSlotsService) {}

  @Post()
  create(@Body() createDto: CreateBlockedSlotDto) {
    return this.blockedSlotsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.blockedSlotsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blockedSlotsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateBlockedSlotDto) {
    return this.blockedSlotsService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blockedSlotsService.remove(+id);
  }
}
