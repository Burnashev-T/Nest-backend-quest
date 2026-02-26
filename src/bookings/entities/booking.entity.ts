import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Quest } from '../../quests-module/entitys/quest.entity';
import { BookingStatus } from './booking-enum.entity';
import { Service } from '../../services-module/entitys/services.entity';

@Entity('bookings')
export class Booking {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column()
  userId: number;

  @ApiProperty({ type: () => Quest })
  @ManyToOne(() => Quest)
  quest: Quest;

  // 👇 НОВЫЕ ПОЛЯ (дата и время)
  @ApiProperty({ example: '2025-06-15' })
  @Column({ type: 'date' })
  date: string;

  @ApiProperty({ example: '15:00' })
  @Column()
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @Column()
  endTime: string;

  @ApiProperty()
  @Column()
  childrenCount: number;

  @ApiProperty({ required: false })
  @Column({ nullable: true })
  comment: string;

  @ApiProperty({ enum: BookingStatus })
  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @ApiProperty({ example: 15000 })
  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number; // полная стоимость мероприятия

  @ApiProperty({ example: 5000 })
  @Column('decimal', { precision: 10, scale: 2 })
  totalDeposit: number; // сумма предоплаты

  @ApiProperty({ type: () => [Service] })
  @ManyToMany(() => Service)
  @JoinTable({ name: 'booking_services' })
  services: Service[];

  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty()
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
