import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { IngestionController } from './controllers/ingestion.controller';
import { DataIngestionService } from './services/data-ingestion.service';
import { CsvProcessorService } from './services/csv-processor.service';
import { BlobStorageService } from './services/blob-storage.service';
import { MessageService } from './services/message.service';
import { MessageConsumerService } from './services/message-consumer.service';
import { Sample } from './entities/sample.entity';
import { DataSource } from './entities/data-source.entity';
import { DataIngestionJob } from './entities/data-ingestion-job.entity';
import { ProcessedData } from './entities/processed-data.entity';
import { ProcessedDataResolver } from './processed-data.resolver';
import { DevController } from './controllers/dev.controller';
import { DevOpsService } from './services/dev-ops.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sample,
      DataSource,
      DataIngestionJob,
      ProcessedData,
    ]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  ],
  controllers: [DataController, IngestionController, DevController],
  providers: [
    DataService,
    DataIngestionService,
    CsvProcessorService,
    BlobStorageService,
    MessageService,
    MessageConsumerService,
    ProcessedDataResolver,
    DevOpsService,
  ],
})
export class DataModule {}
