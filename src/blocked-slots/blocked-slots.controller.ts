// blocked-slots/blocked-slots.controller.ts
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
import { BlockedSlotsService } from './blocked-slots.service';
import { CreateBlockedSlotDto } from './dto/create-blocked-slot.dto';
import { UpdateBlockedSlotDto } from './dto/update-blocked-slot.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('blocked-slots')
@Controller('blocked-slots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class BlockedSlotsController {
  constructor(private readonly blockedSlotsService: BlockedSlotsService) {}

  @Post()
  async create(@Body() createDto: CreateBlockedSlotDto) {
    return this.blockedSlotsService.create(createDto);
  }

  @Get()
  async findAll() {
    return this.blockedSlotsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.blockedSlotsService.findOne(+id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBlockedSlotDto,
  ) {
    return this.blockedSlotsService.update(+id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.blockedSlotsService.remove(+id);
  }
}
