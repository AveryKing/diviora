import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from '../entities/data-source.entity';
import { DataIngestionJob } from '../entities/data-ingestion-job.entity';
import { ProcessedData } from '../entities/processed-data.entity';
import { BlobStorageService } from './blob-storage.service';
import { MessageService } from './message.service';
import { CsvProcessorService } from './csv-processor.service';
import { DataSource as TypeOrmDataSource } from 'typeorm';
import * as mssql from 'mssql';

@Injectable()
export class DataIngestionService {
  private readonly logger = new Logger(DataIngestionService.name);

  constructor(
    @InjectRepository(DataSource)
    private dataSourceRepository: Repository<DataSource>,
    @InjectRepository(DataIngestionJob)
    private jobRepository: Repository<DataIngestionJob>,
    @InjectRepository(ProcessedData)
    private processedDataRepository: Repository<ProcessedData>,
    private blobStorageService: BlobStorageService,
    private messageService: MessageService,
    private csvProcessorService: CsvProcessorService,
    private connection: TypeOrmDataSource,
  ) {}

  async processCsvUpload(file: any) {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.blobStorageService.ensureContainerExists();
      const timestamp = Date.now();
      const blobFileName = `csv-uploads/${timestamp}-${file.originalname}`;

      const blobUrl = await this.blobStorageService.uploadFile(
        blobFileName,
        file.buffer,
      );

      const dataSource = queryRunner.manager.create(DataSource, {
        name: `CSV Upload - ${file.originalname}`,
        type: 'csv',
        configuration: JSON.stringify({
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date().toISOString(),
          blobUrl: blobUrl,
          blobPath: blobFileName,
        }),
      });

      const savedDataSource = await queryRunner.manager.save(dataSource);

      const job = queryRunner.manager.create(DataIngestionJob, {
        status: 'queued',
        blobStoragePath: blobFileName,
        dataSourceId: savedDataSource.id,
        recordsProcessed: 0,
      });

      const savedJob = await queryRunner.manager.save(job);

      await queryRunner.commitTransaction();

      const correlationId = await this.messageService.sendDataProcessingMessage(
        savedJob.id,
        blobFileName,
        {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileType: 'csv',
          dataSourceId: savedDataSource.id,
        },
      );

      return {
        message: 'CSV file uploaded successfully and queued for processing',
        dataSource: savedDataSource,
        job: { ...savedJob, correlationId },
        status: 'queued',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new Error(`Failed to process CSV upload: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async downloadOriginalFile(
    jobId: number,
  ): Promise<{ fileName: string; data: Buffer }> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['dataSource'],
    });

    if (!job || !job.blobStoragePath) {
      throw new Error('Job or file not found');
    }

    const data = await this.blobStorageService.downloadFile(
      job.blobStoragePath,
    );
    const config = JSON.parse(job.dataSource.configuration);

    return {
      fileName: config.fileName,
      data: data,
    };
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

    if (dataSource.type === 'api') {
      await this.processApiDataSource(dataSource, savedJob);
    } else if (dataSource.type === 'sql') {
      const config = JSON.parse(dataSource.configuration);

      await this.messageService.sendDataProcessingMessage(
        savedJob.id,
        config.tableName || 'Unknown_Table',
        {
          fileName: config.tableName || 'Unknown_Table',
          fileSize: 0,
          dataSourceId: dataSource.id,
          fileType: 'sql',
        },
      );
    }

    return savedJob;
  }

  async processJobFromQueue(
    jobId: number,
    blobPath: string,
    metadata: {
      fileName: string;
      fileSize: number;
      dataSourceId: number;
      fileType?: string;
      correlationId?: string;
    },
  ): Promise<void> {
    this.logger.log(
      `Starting processing for job ${jobId}, correlationId: ${metadata.correlationId}`,
    );

    try {
      const job = await this.jobRepository.findOne({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      job.status = 'processing';
      job.startedAt = new Date();
      await this.jobRepository.save(job);

      this.logger.log(`Job ${jobId} status updated to processing`);

      this.logger.log(`Downloading file from blob storage: ${blobPath}`);
      const fileBuffer = await this.blobStorageService.downloadFile(blobPath);

      this.logger.log(`Processing CSV file: ${metadata.fileName}`);
      const processingResult = await this.csvProcessorService.processCsvFile(
        fileBuffer,
        metadata.fileName,
      );

      this.logger.log(
        `CSV processing completed. Valid rows: ${processingResult.validRows}, Invalid rows: ${processingResult.invalidRows}`,
      );

      this.logger.log(`Storing processed data for job ${jobId}`);
      await this.storeProcessedData(job, processingResult, metadata.fileName);

      job.status = 'completed';
      job.completedAt = new Date();
      job.recordsProcessed = processingResult.validRows;
      job.errorMessage = null;
      await this.jobRepository.save(job);

      this.logger.log(
        `Job ${jobId} completed successfully. Processed ${processingResult.validRows} records`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing job ${jobId}: ${error.message}`,
        error.stack,
      );

      try {
        const job = await this.jobRepository.findOne({
          where: { id: jobId },
        });

        if (job) {
          job.status = 'failed';
          job.completedAt = new Date();
          job.errorMessage = error.message;
          await this.jobRepository.save(job);
        }
      } catch (updateError) {
        this.logger.error(
          `Failed to update job status to failed: ${updateError.message}`,
        );
      }

      throw error;
    }
  }

  private async processApiDataSource(
    dataSource: DataSource,
    job: DataIngestionJob,
  ) {
    // Implementation for API data source processing
  }

  async discoverTables(sourceId: number): Promise<string[]> {
    const dataSource = await this.dataSourceRepository.findOne({
      where: { id: sourceId },
    });

    if (!dataSource || dataSource.type !== 'sql') {
      throw new BadRequestException(
        'Data source not found or is not a SQL source',
      );
    }

    const config = JSON.parse(dataSource.configuration);
    let pool: mssql.ConnectionPool;

    try {
      pool = await mssql.connect({
        user: config.username,
        password: config.password,
        server: config.host,
        database: config.database,
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
      });

      const result = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
      `);

      return result.recordset.map((row) => row.TABLE_NAME);
    } catch (error) {
      this.logger.error(
        `Discovery failed for source ${sourceId}: ${error.message}`,
      );

      if (error.code === 'ELOGIN') {
        throw new BadRequestException(
          `Login failed: Invalid credentials for user '${config.username}'`,
        );
      } else if (error.code === 'ESOCKET') {
        throw new BadRequestException(
          `Connection failed: Could not reach host '${config.host}'`,
        );
      }

      throw new BadRequestException(`Database Error: ${error.message}`);
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }
}
