// blocked-slots/entities/blocked-slot.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Quest } from '../../quests-module/entitys/quest.entity';

@Entity('blocked_slots')
export class BlockedSlot {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ type: () => Quest })
  @ManyToOne(() => Quest, { onDelete: 'CASCADE' })
  quest: Quest;

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
