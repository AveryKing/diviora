import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DataIngestionJob } from './data-ingestion-job.entity';

@ObjectType()
@Entity('processed_data')
export class ProcessedData {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column('nvarchar', { length: 'MAX' })
  data: string;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  rowNumber: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  sourceFileName: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Int)
  @Column()
  jobId: number;

  @Field(() => Int)
  @Column()
  dataSourceId: number;
}
