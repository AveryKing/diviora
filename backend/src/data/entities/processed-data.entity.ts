import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DataIngestionJob } from './data-ingestion-job.entity';

@Entity('processed_data')
export class ProcessedData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('nvarchar', { length: 'MAX' })
  data: string; // JSON stringified data

  @Column({ nullable: true })
  rowNumber: number;

  @Column({ nullable: true })
  sourceFileName: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => DataIngestionJob)
  @JoinColumn({ name: 'jobId' })
  job: DataIngestionJob;

  @Column()
  jobId: number;
}
