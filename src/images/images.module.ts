import { Module } from '@nestjs/common';
import { MinioService } from './minio.service';
import { ImagesController } from './images.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [ImagesController],
  providers: [MinioService],
  exports: [MinioService],
})
export class ImagesModule {}
