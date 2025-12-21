import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { DataService } from './data.service';
import { ProcessedData } from './entities/processed-data.entity';

@Resolver(() => ProcessedData)
export class ProcessedDataResolver {
  constructor(private readonly dataService: DataService) {}

  @Query(() => [ProcessedData], { name: 'getProcessedData' })
  async getProcessedData(
    @Args('jobId', { type: () => Int, nullable: true }) jobId?: number,
  ) {
    return this.dataService.findAll(jobId);
  }
}
