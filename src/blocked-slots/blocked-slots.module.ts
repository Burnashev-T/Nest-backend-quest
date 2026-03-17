// blocked-slots/blocked-slots.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockedSlotsService } from './blocked-slots.service';
import { BlockedSlotsController } from './blocked-slots.controller';
import { BlockedSlot } from './entities/blocked-slot.entity';
import { QuestsModuleModule } from '../quests-module/quests-module.module';
import { Booking } from '../bookings/entities/booking.entity'; // для доступа к репозиторию Quest

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockedSlot, Booking]),
    QuestsModuleModule,
  ],
  controllers: [BlockedSlotsController],
  providers: [BlockedSlotsService],
  exports: [BlockedSlotsService],
})
export class BlockedSlotsModule {}
