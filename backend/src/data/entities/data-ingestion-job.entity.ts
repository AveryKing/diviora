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
  status: string; // 'pending', 'running', 'completed', 'failed'

  @Column({ nullable: true })
  recordsProcessed: number;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  blobStoragePath: string; // Path to raw data in Azure Blob Storage

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne('DataSource', 'ingestionJobs')
  @JoinColumn({ name: 'dataSourceId' })
  dataSource: any;

  @Column()
  dataSourceId: number;
}
