import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('schedule_events')
export class ScheduleEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'date' })
  date: string;

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column()
  questTitle: string;

  @Column({ type: 'text', nullable: true })
  rolesDescription: string | null;
}
