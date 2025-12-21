import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessedData } from './entities/processed-data.entity';

@Injectable()
export class DataService {
  constructor(
    @InjectRepository(ProcessedData)
    private readonly processedDataRepository: Repository<ProcessedData>,
  ) {}

  async findAll(jobId?: number): Promise<ProcessedData[]> {
    const query = this.processedDataRepository.createQueryBuilder('data');

    if (jobId) {
      query.where('data.jobId = :jobId', { jobId });
    }

    return query.orderBy('data.createdAt', 'DESC').take(100).getMany();
  }
}
