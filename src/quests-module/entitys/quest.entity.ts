// quests-module/entitys/quest.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('quests')
export class Quest {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Пиратский квест' })
  @Column()
  title: string;

  @ApiProperty({ example: 'Описание...' })
  @Column('text')
  description: string;

  // Базовая стоимость часа для группы до 4 человек
  @ApiProperty({ example: 5000 })
  @Column('decimal', { precision: 10, scale: 2 })
  basePricePerHour: number;

  // Доплата за каждого дополнительного человека сверх 4 (за час)
  @ApiProperty({ example: 1000 })
  @Column('decimal', { precision: 10, scale: 2, default: 1000 })
  extraPlayerPrice: number;

  // Предоплата за час (фиксированная)
  @ApiProperty({ example: 2000 })
  @Column('decimal', { precision: 10, scale: 2 })
  depositPerHour: number;

  @ApiProperty({ example: 10 })
  @Column('int')
  maxParticipants: number;

  @ApiProperty({ type: [String] })
  @Column('text', { array: true, default: [] })
  images: string[];

  @ApiProperty({ example: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
