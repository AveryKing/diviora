import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { BlobStorageService } from '../src/data/services/blob-storage.service';
import { MessageService } from '../src/data/services/message.service';

describe('CSV Upload API (e2e)', () => {
  let app: INestApplication<App>;
  let blobStorageService: BlobStorageService;
  let messageService: MessageService;

  // Mock implementations
  const mockBlobStorageService = {
    ensureContainerExists: jest.fn().mockResolvedValue(true),
    uploadFile: jest
      .fn()
      .mockResolvedValue('https://mock-blob-storage.com/test-file.csv'),
    downloadFile: jest.fn().mockResolvedValue(Buffer.from('mock,csv,data')),
  };

  const mockMessageService = {
    sendDataProcessingMessage: jest
      .fn()
      .mockResolvedValue('mock-correlation-id-123'),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BlobStorageService)
      .useValue(mockBlobStorageService)
      .overrideProvider(MessageService)
      .useValue(mockMessageService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    blobStorageService = moduleFixture.get<BlobStorageService>(
      BlobStorageService,
    );
    messageService = moduleFixture.get<MessageService>(MessageService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /ingestion/csv-upload', () => {
    it('should successfully upload a valid CSV file', async () => {
      // Create a mock CSV file
      const csvContent = `name,email,age
John Doe,john@example.com,30
Jane Smith,jane@example.com,25
Bob Johnson,bob@example.com,35`;

      const response = await request(app.getHttpServer())
        .post('/ingestion/csv-upload')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test-users.csv',
          contentType: 'text/csv',
        })
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('uploaded successfully');
      expect(response.body).toHaveProperty('dataSource');
      expect(response.body).toHaveProperty('job');
      expect(response.body).toHaveProperty('blobUrl');
      expect(response.body).toHaveProperty('status', 'queued');

      // Verify data source details
      expect(response.body.dataSource).toMatchObject({
        name: expect.stringContaining('test-users.csv'),
        type: 'csv',
        isActive: true,
      });

      // Verify job details
      expect(response.body.job).toMatchObject({
        status: 'queued',
        recordsProcessed: 0,
        correlationId: 'mock-correlation-id-123',
      });
      expect(response.body.job).toHaveProperty('blobStoragePath');

      // Verify blob storage was called
      expect(mockBlobStorageService.ensureContainerExists).toHaveBeenCalled();
      expect(mockBlobStorageService.uploadFile).toHaveBeenCalledWith(
        expect.stringMatching(/csv-uploads\/\d+-test-users\.csv/),
        expect.any(Buffer),
      );

      // Verify message service was called
      expect(mockMessageService.sendDataProcessingMessage).toHaveBeenCalledWith(
        expect.any(Number),
        expect.stringMatching(/csv-uploads\/\d+-test-users\.csv/),
        expect.objectContaining({
          fileName: 'test-users.csv',
          mimeType: 'text/csv',
        }),
      );
    });

    it('should reject upload when no file is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/ingestion/csv-upload')
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('No file uploaded');
    });

    it('should reject upload of non-CSV files', async () => {
      const txtContent = 'This is a text file, not a CSV';

      const response = await request(app.getHttpServer())
        .post('/ingestion/csv-upload')
        .attach('file', Buffer.from(txtContent), {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Only CSV files are allowed');
    });

    it('should accept CSV files with .csv extension even with wrong mimetype', async () => {
      const csvContent = `id,name\n1,Test`;

      const response = await request(app.getHttpServer())
        .post('/ingestion/csv-upload')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test.csv',
          contentType: 'application/octet-stream',
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('uploaded successfully');
    });

    it('should handle large CSV files', async () => {
      // Generate a larger CSV file
      let csvContent = 'id,name,email,phone,address\n';
      for (let i = 1; i <= 1000; i++) {
        csvContent += `${i},User${i},user${i}@example.com,555-000${i},Address ${i}\n`;
      }

      const response = await request(app.getHttpServer())
        .post('/ingestion/csv-upload')
        .attach('file', Buffer.from(csvContent), {
          filename: 'large-dataset.csv',
          contentType: 'text/csv',
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.job.status).toBe('queued');
      expect(mockBlobStorageService.uploadFile).toHaveBeenCalled();
    });

    it('should handle CSV with special characters in filename', async () => {
      const csvContent = `name,value\ntest,123`;

      const response = await request(app.getHttpServer())
        .post('/ingestion/csv-upload')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test-file-with-special-chars-@#$.csv',
          contentType: 'text/csv',
        })
        .expect(201);

      expect(response.body.dataSource.name).toContain(
        'test-file-with-special-chars-@#$.csv',
      );
    });
  });

  describe('GET /ingestion/data-sources', () => {
    it('should retrieve all data sources', async () => {
      const response = await request(app.getHttpServer())
        .get('/ingestion/data-sources')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Integration: Upload and Retrieve', () => {
    it('should upload CSV and then retrieve the data source', async () => {
      const csvContent = `product,price,quantity
Widget,19.99,100
Gadget,29.99,50`;

      // Upload CSV
      const uploadResponse = await request(app.getHttpServer())
        .post('/ingestion/csv-upload')
        .attach('file', Buffer.from(csvContent), {
          filename: 'products.csv',
          contentType: 'text/csv',
        })
        .expect(201);

      const dataSourceId = uploadResponse.body.dataSource.id;
      const jobId = uploadResponse.body.job.id;

      // Retrieve data sources
      const dataSourcesResponse = await request(app.getHttpServer())
        .get('/ingestion/data-sources')
        .expect(200);

      const createdDataSource = dataSourcesResponse.body.find(
        (ds) => ds.id === dataSourceId,
      );
      expect(createdDataSource).toBeDefined();
      expect(createdDataSource.name).toContain('products.csv');

      // Retrieve jobs for the data source
      const jobsResponse = await request(app.getHttpServer())
        .get(`/ingestion/jobs/${dataSourceId}`)
        .expect(200);

      expect(Array.isArray(jobsResponse.body)).toBe(true);
      const createdJob = jobsResponse.body.find((job) => job.id === jobId);
      expect(createdJob).toBeDefined();
      expect(createdJob.status).toBe('queued');
    });
  });

  describe('Error Handling', () => {
    it('should handle blob storage errors gracefully', async () => {
      // Temporarily override to throw error
      mockBlobStorageService.uploadFile.mockRejectedValueOnce(
        new Error('Blob storage unavailable'),
      );

      const csvContent = `test,data\n1,2`;

      const response = await request(app.getHttpServer())
        .post('/ingestion/csv-upload')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test.csv',
          contentType: 'text/csv',
        })
        .expect(500);

      expect(response.body.message).toContain('Failed to process CSV upload');
    });

    it('should handle message service errors gracefully', async () => {
      // Temporarily override to throw error
      mockMessageService.sendDataProcessingMessage.mockRejectedValueOnce(
        new Error('Message queue unavailable'),
      );

      const csvContent = `test,data\n1,2`;

      const response = await request(app.getHttpServer())
        .post('/ingestion/csv-upload')
        .attach('file', Buffer.from(csvContent), {
          filename: 'test.csv',
          contentType: 'text/csv',
        })
        .expect(500);

      expect(response.body.message).toContain('Failed to process CSV upload');
    });
  });
});
