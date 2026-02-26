import { Module } from '@nestjs/common';
import { QuestsService } from './quests-module.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quest } from './entitys/quest.entity';
import { QuestsController } from './quests-module.controller';
import { ImagesModule } from '../images/images.module';

@Module({
  imports: [TypeOrmModule.forFeature([Quest]), ImagesModule],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService, TypeOrmModule],
})
export class QuestsModuleModule {}
