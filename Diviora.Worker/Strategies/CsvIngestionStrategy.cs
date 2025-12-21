using Diviora.Worker.Models;
using Microsoft.Extensions.Logging;
using CsvHelper;
using System.Globalization;
using Azure.Storage.Blobs;
using System.Text.Json;
using Microsoft.Data.SqlClient;
using Dapper;

namespace Diviora.Worker.Strategies
{
    public class CsvIngestionStrategy(ILogger<CsvIngestionStrategy> logger) : BaseIngestionStrategy
    {
        private readonly string _blobConnectionString = Environment.GetEnvironmentVariable("AZURE_STORAGE_CONNECTION_STRING") ?? "";

        public override async Task ExecuteAsync(JobMessage job)
        {
            logger.LogInformation($"[CSV Strategy] Starting Job {job.JobId} ({job.FileName})...");

            var blobServiceClient = new BlobServiceClient(_blobConnectionString);
            var containerClient = blobServiceClient.GetBlobContainerClient("diviora-data");
            var blobClient = containerClient.GetBlobClient(job.BlobPath);

            await using var dbConnection = new SqlConnection(_sqlConnectionString);
            await dbConnection.OpenAsync();

            await using var blobStream = await blobClient.OpenReadAsync();
            using var reader = new StreamReader(blobStream);
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

            var batch = new List<ProcessedData>();
            var batchSize = 1000; 
            var totalRecords = 0;

            var records = csv.GetRecordsAsync<dynamic>();

            await foreach (var record in records)
            {
                totalRecords++;
                var jsonData = JsonSerializer.Serialize(record);

                batch.Add(new ProcessedData
                {
                    JobId = job.JobId,
                    RowNumber = totalRecords,
                    Data = jsonData,
                    SourceFileName = job.FileName,
                    CreatedAt = DateTime.UtcNow
                });

                if (batch.Count < batchSize) continue;
                await BulkInsertAsync(dbConnection, batch);
                batch.Clear();
            }

            if (batch.Count > 0) await BulkInsertAsync(dbConnection, batch);

            logger.LogInformation($"[CSV Strategy] Completed Job {job.JobId}. Processed {totalRecords} rows.");
        }
        
    }
}