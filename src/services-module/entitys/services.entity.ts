import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';


@Entity('service')
export class Service {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Съёмка прохождения' })
  @Column({ length: 255 })
  name: string;

  @ApiProperty({ example: 'Профессиональная видеосъёмка квеста' })
  @Column('text', { nullable: true })
  description: string;

  @ApiProperty({ example: 1500 })
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @ApiProperty({ example: true })
  @Column({ default: true })
  isActive: boolean;
}
