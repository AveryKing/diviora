# Azure Functions Migration Guide

This guide explains how to migrate the CSV processing from the local background processor to Azure Functions for production deployment.

## Current Architecture (Local Development)

```
CSV Upload API
  ↓
Upload to Blob Storage + Create Job
  ↓
Send Message to Service Bus Queue
  ↓
MessageConsumerService (In-App Background Processor)
  ↓
Process CSV & Save to Database
```

## Production Architecture (Azure Functions)

```
CSV Upload API
  ↓
Upload to Blob Storage + Create Job
  ↓
Send Message to Service Bus Queue
  ↓
Azure Function (Service Bus Trigger)
  ↓
Process CSV & Save to Database
```

## Benefits of Azure Functions

- **Serverless**: No server management, automatic scaling
- **Cost-effective**: Pay only for execution time
- **Auto-scaling**: Scales based on queue depth
- **Resilience**: Built-in retry policies and dead-letter queues
- **Monitoring**: Integrated with Application Insights

## Migration Steps

### Step 1: Create Azure Function App

```bash
# Using Azure CLI
az functionapp create \
  --resource-group your-resource-group \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name diviora-csv-processor \
  --storage-account yourstorageaccount
```

### Step 2: Create Function Code

Create a new directory `/azure-functions` in your backend:

**azure-functions/csv-processor/function.json**
```json
{
  "bindings": [
    {
      "name": "message",
      "type": "serviceBusTrigger",
      "direction": "in",
      "queueName": "data-processing",
      "connection": "AZURE_SERVICE_BUS_CONNECTION_STRING"
    }
  ]
}
```

**azure-functions/csv-processor/index.ts**
```typescript
import { AzureFunction, Context } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { Connection } from "typeorm";
import { parse } from "csv-parse/sync";

const serviceBusTrigger: AzureFunction = async function (
  context: Context,
  message: any
): Promise<void> {
  context.log("Service Bus queue trigger function processed message:", message);

  const { jobId, blobPath, fileName, fileSize, dataSourceId, correlationId } = message;

  try {
    // 1. Update job status to processing
    await updateJobStatus(jobId, "processing");

    // 2. Download CSV from blob storage
    const csvBuffer = await downloadBlob(blobPath);

    // 3. Process CSV
    const processedData = await processCSV(csvBuffer, fileName);

    // 4. Store processed data in database
    await storeProcessedData(jobId, processedData, fileName);

    // 5. Update job status to completed
    await updateJobStatus(jobId, "completed", {
      recordsProcessed: processedData.validRows,
      errorMessage: null,
    });

    context.log(`Job ${jobId} completed successfully. Processed ${processedData.validRows} records`);
  } catch (error) {
    context.log.error(`Error processing job ${jobId}:`, error);

    // Update job status to failed
    await updateJobStatus(jobId, "failed", {
      errorMessage: error.message,
    });

    throw error; // Let Service Bus handle retries
  }
};

async function downloadBlob(blobPath: string): Promise<Buffer> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER
  );
  const blobClient = containerClient.getBlobClient(blobPath);

  const downloadResponse = await blobClient.download();
  const chunks: Buffer[] = [];

  for await (const chunk of downloadResponse.readableStreamBody) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function processCSV(buffer: Buffer, fileName: string) {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  // Add your CSV validation logic here
  return {
    validRows: records.length,
    invalidRows: 0,
    data: records,
  };
}

async function updateJobStatus(
  jobId: number,
  status: string,
  additional?: any
) {
  // Use your database connection to update job
  // You can use TypeORM, Prisma, or raw SQL queries
}

async function storeProcessedData(
  jobId: number,
  processedData: any,
  fileName: string
) {
  // Store the processed data in your database
}

export default serviceBusTrigger;
```

### Step 3: Extract Reusable Logic

To avoid code duplication, extract the CSV processing logic into a shared package:

**shared/csv-processor.ts**
```typescript
// This can be shared between your NestJS app and Azure Functions
export class CsvProcessor {
  async processCsvFile(fileBuffer: Buffer, fileName: string) {
    // Copy logic from CsvProcessorService
  }

  validateAndCleanData(records: any[], columns: string[], errors: string[]) {
    // Copy logic from CsvProcessorService
  }
}
```

### Step 4: Configure Application Settings

In Azure Portal, configure these application settings:

```
AZURE_SERVICE_BUS_CONNECTION_STRING=Endpoint=sb://...
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER=diviora-data
DB_HOST=your-sql-server.database.windows.net
DB_PORT=1433
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_DATABASE=diviora
```

### Step 5: Deploy Function

```bash
# Build your function
npm run build

# Deploy to Azure
func azure functionapp publish diviora-csv-processor
```

### Step 6: Disable Local Consumer

Once Azure Function is deployed and working, disable the local message consumer:

**Option 1: Environment Variable**
Add to `.env`:
```
ENABLE_MESSAGE_CONSUMER=false
```

Then update `message-consumer.service.ts`:
```typescript
async onModuleInit() {
  const enabled = this.configService.get<string>('ENABLE_MESSAGE_CONSUMER', 'true');
  if (enabled === 'true') {
    this.logger.log('Starting message consumer...');
    this.startProcessing();
  } else {
    this.logger.log('Message consumer disabled');
  }
}
```

**Option 2: Remove from providers** (for production only)
Remove `MessageConsumerService` from DataModule providers array.

## Monitoring and Troubleshooting

### View Function Logs
```bash
# Stream logs in real-time
func azure functionapp logstream diviora-csv-processor
```

### Check Application Insights
1. Go to Azure Portal → Your Function App → Application Insights
2. View:
   - Execution count and duration
   - Failure rate
   - Dependencies (Service Bus, SQL, Blob Storage)
   - Exceptions

### Dead Letter Queue
Messages that fail after max retries go to the dead letter queue:
```bash
# View dead letter messages
az servicebus queue show \
  --resource-group your-rg \
  --namespace-name your-namespace \
  --name data-processing/$DeadLetterQueue
```

## Cost Estimation

**Azure Functions Consumption Plan:**
- First 1M executions/month: FREE
- After that: $0.20 per million executions
- Execution time: $0.000016/GB-s

**Example:**
- 10,000 CSV uploads/month
- Average processing time: 2 seconds
- Memory: 512 MB
- **Monthly cost: ~$2-5**

## Testing Azure Function Locally

```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Run function locally
cd azure-functions
func start

# Send test message
# Use Azure Service Bus Explorer in Azure Portal
```

## Alternative: Azure Container Apps

If you prefer to keep your NestJS code as-is:

```bash
# Deploy entire NestJS app as container
az containerapp create \
  --name diviora-api \
  --resource-group your-rg \
  --environment your-env \
  --image your-registry.azurecr.io/diviora-api:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10
```

Benefits:
- No code changes needed
- Runs your existing Docker container
- Can scale to zero
- Slightly higher cost than Functions

## Recommended Approach

**For MVP/Early Stage:**
- Use the current in-app background processor
- Simple, easy to debug, minimal infrastructure

**For Production/Scale:**
- Migrate to Azure Functions
- Better scalability and cost efficiency
- Separation of concerns (API vs. background processing)

## Next Steps

1. ✅ Current: In-app background processor working
2. Test thoroughly with various CSV files locally
3. Set up Azure Function App
4. Deploy and test in staging environment
5. Monitor performance and costs
6. Gradually migrate traffic from in-app to Azure Functions