using Diviora.Worker.Models;
using Microsoft.Extensions.Logging;
using CsvHelper;
using System.Globalization;
using Azure.Storage.Blobs;

namespace Diviora.Worker.Strategies
{
    public class CsvIngestionStrategy : IJobStrategy
    {
        private readonly ILogger<CsvIngestionStrategy> _logger;
        
        private readonly string _blobConnectionString = Environment.GetEnvironmentVariable("AZURE_STORAGE_CONNECTION_STRING");

        public CsvIngestionStrategy(ILogger<CsvIngestionStrategy> logger)
        {
            _logger = logger;
        }

        public async Task ExecuteAsync(JobMessage job)
        {
            _logger.LogInformation($"[CSV Strategy] Starting processing for {job.FileName}...");

            if (string.IsNullOrEmpty(_blobConnectionString))
            {
                throw new InvalidOperationException("AZURE_STORAGE_CONNECTION_STRING is not set.");
            }

            var blobServiceClient = new BlobServiceClient(_blobConnectionString);
            var containerClient = blobServiceClient.GetBlobContainerClient("diviora-data");
            var blobClient = containerClient.GetBlobClient(job.BlobPath);

            await using var blobStream = await blobClient.OpenReadAsync();
            using var reader = new StreamReader(blobStream);
            using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

            int recordCount = 0;
            
            while (await csv.ReadAsync())
            {
                recordCount++;
              // todo: add dapper/bulk sql insert
            }

            _logger.LogInformation($"[CSV Strategy] Completed. Processed {recordCount} rows.");
        }
    }
}