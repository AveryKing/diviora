import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
@Entity('data_ingestion_jobs')
export class DataIngestionJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  status: string; // 'queued', 'processing', 'completed', 'failed'

  @Column({ nullable: true })
  recordsProcessed: number;

  @Column({ nullable: true, type: 'nvarchar', length: 'MAX' })
  errorMessage: string | null;

  @Column({ nullable: true })
  blobStoragePath: string; // Path to raw data in Azure Blob Storage

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @ManyToOne('DataSource', 'ingestionJobs')
  @JoinColumn({ name: 'dataSourceId' })
  dataSource: any;

  @Column()
  dataSourceId: number;
}
