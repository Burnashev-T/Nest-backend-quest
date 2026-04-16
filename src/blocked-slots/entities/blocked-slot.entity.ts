import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Quest } from '../../quests-module/entitys/quest.entity';

@Entity('blocked_slots')
export class BlockedSlot {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: () => Quest, nullable: true })
  @ManyToOne(() => Quest, { onDelete: 'CASCADE', nullable: true })
  quest: Quest | null;

  @Index()
  @ApiProperty({ example: '2025-06-15' })
  @Column({ type: 'date' })
  date: string;

  @ApiProperty({ example: '10:00' })
  @Column()
  startTime: string;

  @ApiProperty({ example: '12:00' })
  @Column()
  endTime: string;

  @ApiProperty({ required: false })
  @Column({ nullable: true })
  reason: string; // причина блокировки (опционально)
}
