import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from '../entities/data-source.entity';
import { DataIngestionJob } from '../entities/data-ingestion-job.entity';
import { ProcessedData } from '../entities/processed-data.entity';
import { CsvProcessorService } from './csv-processor.service';
// import { BlobStorageService } from './blob-storage.service';
// import { MessageService } from './message.service';

@Injectable()
export class DataIngestionService {
  constructor(
    @InjectRepository(DataSource)
    private dataSourceRepository: Repository<DataSource>,
    @InjectRepository(DataIngestionJob)
    private jobRepository: Repository<DataIngestionJob>,
    @InjectRepository(ProcessedData)
    private processedDataRepository: Repository<ProcessedData>,
    private csvProcessorService: CsvProcessorService,
    // private blobStorageService: BlobStorageService,
    // private messageService: MessageService,
  ) {}

  async processCsvUpload(file: any) {
    let job: DataIngestionJob | undefined;

    try {
      // Create a data source record
      const dataSource = this.dataSourceRepository.create({
        name: `CSV Upload - ${file.originalname}`,
        type: 'csv',
        configuration: JSON.stringify({
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date().toISOString(),
        }),
      });

      const savedDataSource = await this.dataSourceRepository.save(dataSource);

      // Create an ingestion job
      job = this.jobRepository.create({
        status: 'running',
        blobStoragePath: `csv-uploads/${Date.now()}-${file.originalname}`,
        dataSourceId: savedDataSource.id,
        recordsProcessed: 0,
      });

      job = await this.jobRepository.save(job);

      // Process the CSV file
      const processingResult = await this.csvProcessorService.processCsvFile(
        file.buffer,
        file.originalname,
      );

      // Store the processed data
      await this.storeProcessedData(job, processingResult, file.originalname);

      // Update job status
      job.status = processingResult.validRows > 0 ? 'completed' : 'failed';
      job.recordsProcessed = processingResult.validRows;

      if (processingResult.errors.length > 0) {
        job.errorMessage = processingResult.errors.slice(0, 5).join('; ');
      }

      job = await this.jobRepository.save(job);

      return {
        message: 'CSV file processed successfully',
        dataSource: savedDataSource,
        job,
        processingResult: {
          totalRows: processingResult.totalRows,
          validRows: processingResult.validRows,
          invalidRows: processingResult.invalidRows,
          columns: processingResult.columns,
          errorCount: processingResult.errors.length,
        },
        summary:
          this.csvProcessorService.generateProcessingSummary(processingResult),
      };
    } catch (error) {
      // Update job status to failed if job was created
      if (job) {
        job.status = 'failed';
        job.errorMessage = error.message;
        await this.jobRepository.save(job);
      }

      throw new Error(`Failed to process CSV upload: ${error.message}`);
    }
  }

  private async storeProcessedData(
    job: DataIngestionJob,
    processingResult: any,
    fileName: string,
  ): Promise<void> {
    const processedDataEntries = processingResult.data.map((row) => {
      return this.processedDataRepository.create({
        jobId: job.id,
        data: JSON.stringify(row),
        rowNumber: row._rowNumber,
        sourceFileName: fileName,
      });
    });

    // Save in batches to avoid memory issues with large files
    const batchSize = 100;
    for (let i = 0; i < processedDataEntries.length; i += batchSize) {
      const batch = processedDataEntries.slice(i, i + batchSize);
      await this.processedDataRepository.save(batch);
    }
  }

  async getProcessedData(jobId: number, page: number = 1, limit: number = 50) {
    const [data, total] = await this.processedDataRepository.findAndCount({
      where: { jobId },
      order: { rowNumber: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: data.map((item) => ({
        id: item.id,
        rowNumber: item.rowNumber,
        data: JSON.parse(item.data),
        createdAt: item.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createDataSource(createDataSourceDto: any) {
    const dataSource = this.dataSourceRepository.create(createDataSourceDto);
    return this.dataSourceRepository.save(dataSource);
  }

  async getDataSources() {
    return this.dataSourceRepository.find({
      relations: ['ingestionJobs'],
    });
  }

  async getJobsForSource(sourceId: number) {
    return this.jobRepository.find({
      where: { dataSourceId: sourceId },
      order: { createdAt: 'DESC' },
    });
  }

  async triggerIngestion(sourceId: number) {
    const dataSource = await this.dataSourceRepository.findOne({
      where: { id: sourceId },
    });

    if (!dataSource) {
      throw new Error('Data source not found');
    }

    const job = this.jobRepository.create({
      status: 'pending',
      dataSourceId: sourceId,
    });

    const savedJob = await this.jobRepository.save(job);

    // Trigger processing based on data source type
    if (dataSource.type === 'api') {
      // Handle API data source
      await this.processApiDataSource(dataSource, savedJob);
    }

    return savedJob;
  }

  private async processApiDataSource(
    dataSource: DataSource,
    job: DataIngestionJob,
  ) {
    // Implementation for API data source processing
    // This would make HTTP requests to the configured API endpoint
    // and store the data in blob storage for further processing
  }
}
