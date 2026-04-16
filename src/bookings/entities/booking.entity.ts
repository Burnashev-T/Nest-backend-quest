import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Quest } from '../../quests-module/entitys/quest.entity';
import { Service } from '../../services-module/entitys/services.entity';
import { BookingStatus } from './booking-enum.entity';

@Entity('bookings')
export class Booking {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Иван Петров' })
  @Column()
  clientName: string;

  @ApiProperty({ example: '+79001234567' })
  @Column()
  clientPhone: string;

  @Index()
  @ApiProperty({ type: () => Quest })
  @ManyToOne(() => Quest)
  quest: Quest;

  @Index()
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

  @Index()
  @ApiProperty({ enum: BookingStatus })
  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @ApiProperty({ example: 15000 })
  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number;

  @ApiProperty({ example: 5000 })
  @Column('decimal', { precision: 10, scale: 2 })
  totalDeposit: number;

  @ApiProperty({ type: () => [Service] })
  @ManyToMany(() => Service)
  @JoinTable({ name: 'booking_services' })
  services: Service[];

  @ApiProperty({ example: 1 }) // ID администратора, создавшего бронь
  @Column({ nullable: true })
  createdByAdminId: number;

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
