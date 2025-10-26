# CSV Processing Flow - Complete Guide

## Overview

Your CSV processing pipeline is now fully functional! Files are uploaded, queued, processed in the background, and stored in the database.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CSV Upload Flow                          │
└─────────────────────────────────────────────────────────────────┘

1. User uploads CSV via API
   POST /ingestion/csv-upload
   ↓
2. Upload to Azure Blob Storage (Azurite locally)
   Path: csv-uploads/{timestamp}-{filename}
   ↓
3. Create DataSource record
   Track: fileName, fileSize, blobUrl, etc.
   ↓
4. Create DataIngestionJob with status="queued"
   Record job metadata
   ↓
5. Send message to Azure Service Bus
   Queue: data-processing
   Payload: jobId, blobPath, fileName, etc.
   ↓
6. Background Processor picks up message
   MessageConsumerService (runs in your API)
   ↓
7. Update job status to "processing"
   ↓
8. Download CSV from blob storage
   ↓
9. Process CSV file
   - Parse CSV
   - Validate data
   - Clean values (convert types, handle nulls)
   - Track errors
   ↓
10. Store processed data in database
    Table: processed_data
    Batch insert: 100 records at a time
    ↓
11. Update job status to "completed"
    Set recordsProcessed count
```

## API Endpoints

### 1. Upload CSV
```bash
curl -X POST http://localhost:3000/ingestion/csv-upload \
  -F "file=@your-file.csv"
```

**Response:**
```json
{
  "message": "CSV file uploaded successfully and queued for processing",
  "dataSource": {
    "id": 1,
    "name": "CSV Upload - your-file.csv",
    "type": "csv",
    "configuration": "{...}",
    "isActive": true,
    "createdAt": "2025-10-25T..."
  },
  "job": {
    "id": 1,
    "status": "queued",
    "blobStoragePath": "csv-uploads/1234567890-your-file.csv",
    "dataSourceId": 1,
    "recordsProcessed": 0,
    "correlationId": "uuid-here",
    "createdAt": "2025-10-25T..."
  },
  "blobUrl": "http://azurite:10000/...",
  "status": "queued",
  "processingMessage": "Your file is being processed in the background..."
}
```

### 2. Get All Data Sources
```bash
curl http://localhost:3000/ingestion/data-sources
```

### 3. Get Jobs for a Data Source
```bash
curl http://localhost:3000/ingestion/jobs/{dataSourceId}
```

### 4. Get Processed Data
```bash
curl "http://localhost:3000/ingestion/processed-data/{jobId}?page=1&limit=50"
```

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "rowNumber": 2,
      "data": {
        "name": "John Doe",
        "email": "john@example.com",
        "age": 30,
        "_rowNumber": 2,
        "_processedAt": "2025-10-25T..."
      },
      "createdAt": "2025-10-25T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### 5. Download Original CSV
```bash
curl http://localhost:3000/ingestion/download/{jobId} -o downloaded.csv
```

## Database Schema

### data_sources
- `id`: Primary key
- `name`: Display name
- `type`: 'csv', 'api', 'database', 'blob'
- `configuration`: JSON string with metadata
- `isActive`: Boolean
- `createdAt`, `updatedAt`: Timestamps

### data_ingestion_jobs
- `id`: Primary key
- `status`: 'queued', 'processing', 'completed', 'failed'
- `recordsProcessed`: Number of records processed
- `errorMessage`: Error details if failed
- `blobStoragePath`: Path to file in blob storage
- `dataSourceId`: Foreign key to data_sources
- `createdAt`: When job was created
- `startedAt`: When processing started
- `completedAt`: When processing finished

### processed_data
- `id`: Primary key
- `jobId`: Foreign key to data_ingestion_jobs
- `data`: JSON string of processed row
- `rowNumber`: Original row number from CSV
- `sourceFileName`: Original filename
- `createdAt`: Timestamp

## CSV Processing Rules

The `CsvProcessorService` applies these rules:

### Data Cleaning
- **Trimming**: All string values are trimmed
- **Empty rows**: Completely empty rows are skipped
- **Type conversion**:
  - Numbers: Automatically detected and converted
  - Booleans: "true"/"false" strings converted
  - Dates: ISO date format detected and converted

### Validation
- **Critical columns**: Columns with "id", "name", or "email" in the name
- **Empty values**: Critical columns cannot be empty
- **Row metadata**: Each row gets `_rowNumber` and `_processedAt` fields

### Error Tracking
All errors are tracked but don't stop processing:
- Empty rows
- Missing required values
- Invalid data types

## Testing Your CSV Processing

### 1. Create a test CSV
```bash
echo -e "name,email,age\nJohn Doe,john@test.com,30\nJane Smith,jane@test.com,25" > test.csv
```

### 2. Upload it
```bash
curl -X POST http://localhost:3000/ingestion/csv-upload \
  -F "file=@test.csv" | jq '.'
```

### 3. Note the job ID from response, then check processed data
```bash
# Replace {jobId} with actual ID
curl "http://localhost:3000/ingestion/processed-data/{jobId}" | jq '.'
```

### 4. Check job status
```bash
curl "http://localhost:3000/ingestion/jobs/{dataSourceId}" | jq '.'
```

## Monitoring

### View Logs
```bash
# API logs (includes message consumer)
docker-compose logs -f api

# Look for these log entries:
# - "Message consumer started"
# - "Received message"
# - "Starting processing for job"
# - "CSV processing completed"
# - "Job X completed successfully"
```

### Check Azure Service Bus (in Azure Portal)
- Active messages: Messages waiting to be processed
- Dead letter messages: Messages that failed after retries
- Message rate: Messages/second

### Check Azurite (local blob storage)
```bash
# List containers
docker exec diviora-azurite ls /data

# Or use Azure Storage Explorer
# Connect to: http://127.0.0.1:10000
# Account: devstoreaccount1
# Key: Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==
```

## Troubleshooting

### Message not processing
1. Check if MessageConsumerService started:
   ```bash
   docker-compose logs api | grep "Message consumer"
   ```

2. Check Service Bus connection:
   ```bash
   # Look for connection errors in logs
   docker-compose logs api | grep -i "service bus"
   ```

### CSV processing fails
1. Check job error message:
   ```bash
   curl "http://localhost:3000/ingestion/jobs/{dataSourceId}" | jq '.[] | select(.status=="failed")'
   ```

2. View detailed logs:
   ```bash
   docker-compose logs api | grep "Error processing job"
   ```

### Blob storage issues
1. Check Azurite is running:
   ```bash
   docker-compose ps azurite
   ```

2. Test connection:
   ```bash
   curl http://localhost:10000/devstoreaccount1?restype=account&comp=properties
   ```

## Performance Considerations

### Large Files
- Files are processed in memory
- Batch inserts: 100 records at a time
- Consider chunking for files > 10MB

### Scaling
- Current: Single message consumer in API
- Production: Use Azure Functions for auto-scaling
- See: [AZURE_FUNCTIONS_MIGRATION.md](./AZURE_FUNCTIONS_MIGRATION.md)

### Database
- Add indexes on frequently queried fields:
  - `jobId` in processed_data
  - `dataSourceId` in data_ingestion_jobs
  - `status` in data_ingestion_jobs

## Next Steps

- ✅ CSV processing pipeline is working
- [ ] Add more CSV validation rules
- [ ] Implement file size limits
- [ ] Add support for different delimiters (tabs, semicolons)
- [ ] Add data transformation rules
- [ ] Implement scheduled data sources (poll APIs regularly)
- [ ] Migrate to Azure Functions for production
- [ ] Add monitoring dashboards
- [ ] Implement retry policies for failed jobs

## Files Created

1. **Services**:
   - `message-consumer.service.ts` - Background processor
   - `csv-processor.service.ts` - CSV parsing logic
   - `data-ingestion.service.ts` - Job management
   - `blob-storage.service.ts` - Azure Blob Storage
   - `message.service.ts` - Azure Service Bus

2. **Entities**:
   - `data-source.entity.ts`
   - `data-ingestion-job.entity.ts`
   - `processed-data.entity.ts`

3. **Controllers**:
   - `ingestion.controller.ts` - API endpoints

4. **Tests**:
   - `csv-upload.e2e-spec.ts` - E2E tests (needs DB mocking)
   - `test-csv-api.sh` - Manual testing script

5. **Documentation**:
   - This file
   - `AZURE_FUNCTIONS_MIGRATION.md`