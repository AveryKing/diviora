import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DataIngestionService } from '../services/data-ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: DataIngestionService) {}

  @Post('csv-upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(@UploadedFile() file: any) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      throw new Error('Only CSV files are allowed');
    }

    return this.ingestionService.processCsvUpload(file);
  }

  @Get('processed-data/:jobId')
  async getProcessedData(
    @Param('jobId') jobId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.ingestionService.getProcessedData(
      parseInt(jobId),
      parseInt(page),
      parseInt(limit),
    );
  }

  @Post('data-sources')
  async createDataSource(@Body() createDataSourceDto: any) {
    return this.ingestionService.createDataSource(createDataSourceDto);
  }

  @Get('data-sources')
  async getDataSources() {
    return this.ingestionService.getDataSources();
  }

  @Get('data-sources/:id/tables')
  async getTables(@Param('id') sourceId: string) {
    return this.ingestionService.discoverTables(parseInt(sourceId));
  }

  @Get('data-sources/:id/schema')
  async getSchema(@Param('id') id: string, @Query('table') tableName: string) {
    if (!tableName) {
      throw new BadRequestException('Query parameter "table" is required');
    }
    return this.ingestionService.discoverSchema(+id, tableName);
  }
  @Get('jobs/:sourceId')
  async getJobsForSource(@Param('sourceId') sourceId: string) {
    return this.ingestionService.getJobsForSource(parseInt(sourceId));
  }

  @Post('trigger/:sourceId')
  async triggerIngestion(@Param('sourceId') sourceId: string) {
    return this.ingestionService.triggerIngestion(parseInt(sourceId));
  }

  @Get('download/:jobId')
  async downloadOriginalFile(@Param('jobId') jobId: string, @Res() res: any) {
    const { fileName, data } = await this.ingestionService.downloadOriginalFile(
      parseInt(jobId),
    );

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    res.send(data);
  }
}
