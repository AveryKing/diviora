import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProcessedData } from '../entities/processed-data.entity';
import { DataIngestionJob } from '../entities/data-ingestion-job.entity';
import { DataSource as IngestionDataSource } from '../entities/data-source.entity';
import { Sample } from '../entities/sample.entity';

@Injectable()
export class DevOpsService {
  constructor(private readonly dataSource: DataSource) {}

  async wipeAllData() {
    return this.dataSource.transaction(async (manager) => {
      const metas = {
        processed: this.dataSource.getMetadata(ProcessedData),
        jobs: this.dataSource.getMetadata(DataIngestionJob),
        sources: this.dataSource.getMetadata(IngestionDataSource),
        samples: this.dataSource.getMetadata(Sample),
      } as const;

      const bracket = (table: string) =>
        table
          .split('.')
          .map((part) => `[${part.replace(/]/g, ']]')}]`)
          .join('.');

      const resetTable = async (tablePath: string) => {
        await manager.query(`DELETE FROM ${bracket(tablePath)}`);
        try {
          await manager.query(`DBCC CHECKIDENT ('${tablePath}', RESEED, 0)`);
        } catch {
          // Ignore reseed failures (e.g., non-identity tables)
        }
      };

      await resetTable(metas.processed.tablePath || metas.processed.tableName);
      await resetTable(metas.jobs.tablePath || metas.jobs.tableName);
      await resetTable(metas.sources.tablePath || metas.sources.tableName);
      await resetTable(metas.samples.tablePath || metas.samples.tableName);

      return {
        message: 'All data erased (dev)',
        deleted: {
          processed: 'cleared',
          jobs: 'cleared',
          dataSources: 'cleared',
          samples: 'cleared',
        },
      };
    });
  }
}
