import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
@Entity('data_sources')
export class DataSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  type: string; // 'api', 'csv', 'database', 'blob'

  @Column('nvarchar', { length: 'MAX' })
  configuration: string; // JSON string for API endpoints, connection strings, etc.

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('DataIngestionJob', 'dataSource')
  ingestionJobs: any[];
}
