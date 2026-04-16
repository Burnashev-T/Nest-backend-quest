import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  adminId: number;

  @Column()
  adminName: string;

  @Column()
  action: string;

  @Column()
  method: string;

  @Column()
  url: string;

  @Column({ type: 'jsonb', nullable: true })
  requestBody: any;

  @Column({ type: 'jsonb', nullable: true })
  requestParams: any;

  @Column({ type: 'jsonb', nullable: true })
  requestQuery: any;

  @Column({ nullable: true })
  responseStatus: number;

  @CreateDateColumn()
  createdAt: Date;
}
