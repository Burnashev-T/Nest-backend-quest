import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('settings')
export class Setting {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'EARLY_HOURS_START' })
  @Column({ unique: true })
  key: string;

  @ApiProperty({ example: '7' })
  @Column()
  value: string; // храним как строку, при необходимости преобразуем
}
