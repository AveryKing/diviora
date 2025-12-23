import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DataSource } from './data-source.entity';

@Entity()
export class DataIngestionJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  status: string; // 'pending', 'queued', 'processing', 'completed', 'failed'

  @Column({ nullable: true })
  blobStoragePath: string;

  @Column({ default: 0 })
  recordsProcessed: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'text', nullable: true })
  runConfiguration: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column()
  dataSourceId: number;

  @ManyToOne(() => DataSource, (dataSource) => dataSource.ingestionJobs)
  @JoinColumn({ name: 'dataSourceId' })
  dataSource: DataSource;
}
