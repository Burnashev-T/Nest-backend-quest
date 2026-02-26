import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

@Entity('users')
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: '+79001234567' })
  @Column({ unique: true })
  phone: string;

  @Column()
  passwordHash: string; // храним bcrypt hash

  @ApiProperty({ enum: UserRole, default: UserRole.USER })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @ApiProperty({ required: false })
  @Column({ nullable: true })
  name: string;

  @ApiProperty({ default: false })
  @Column({ default: false })
  isPhoneConfirmed: boolean; // подтверждён ли номер

  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
