import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sample } from './entities/sample.entity';

@Injectable()
export class DataService {
  constructor(
    @InjectRepository(Sample)
    private sampleRepository: Repository<Sample>,
  ) {}

  async createSample(name: string, description?: string): Promise<Sample> {
    const sample = this.sampleRepository.create({ name, description });
    return this.sampleRepository.save(sample);
  }

  async findAllSamples(): Promise<Sample[]> {
    return this.sampleRepository.find();
  }

  async findSampleById(id: number): Promise<Sample | null> {
    return this.sampleRepository.findOne({ where: { id } });
  }
}
