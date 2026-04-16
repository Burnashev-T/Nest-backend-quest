import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleService } from './schedule.service';
import { ScheduleEvent } from './entities/schedule-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ScheduleEvent])],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
