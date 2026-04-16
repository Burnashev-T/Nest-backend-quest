import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestsService } from './quests-module.service';
import { QuestsController } from './quests-module.controller';
import { Quest } from './entitys/quest.entity';
import { ImagesModule } from '../images/images.module';
import { BookingsModule } from '../bookings/bookings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quest]),
    ImagesModule,
    forwardRef(() => BookingsModule), // разрешаем циклическую зависимость
  ],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService, TypeOrmModule],
})
export class QuestsModuleModule {}
