using Diviora.Worker.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Data.SqlClient;
using Dapper;
using System.Text.Json;

namespace Diviora.Worker.Strategies;

public class SqlIngestionStrategy(ILogger<SqlIngestionStrategy> logger) : BaseIngestionStrategy
{
    public override async Task ExecuteAsync(JobMessage job)
    {
        logger.LogInformation($"[SQL Strategy] Starting Job {job.JobId} for Source Table: {job.FileName}...");

        var sourceConnectionString = Environment.GetEnvironmentVariable("SOURCE_DB_CONNECTION_STRING") ?? _sqlConnectionString;

        await using var sourceConn = new SqlConnection(sourceConnectionString);
        await sourceConn.OpenAsync();

        await using var destConn = new SqlConnection(_sqlConnectionString);
        await destConn.OpenAsync();

        var batch = new List<ProcessedData>();
        var batchSize = 1000;
        var totalRecords = 0;

        // TODO: In production, validate job.FileName to prevent SQL Injection
        var query = $"SELECT * FROM {job.FileName}";

        await using var reader = await sourceConn.ExecuteReaderAsync(query);
        var parser = reader.GetRowParser<dynamic>();

        while (await reader.ReadAsync())
        {
            totalRecords++;
            var row = parser(reader);
            var jsonData = JsonSerializer.Serialize(row);

            batch.Add(new ProcessedData
            {
                JobId = job.JobId,
                RowNumber = totalRecords,
                Data = jsonData,
                SourceFileName = $"SQL_TABLE_{job.FileName}",
                CreatedAt = DateTime.UtcNow
            });

            if (batch.Count < batchSize) continue;
            await BulkInsertAsync(destConn, batch);
            batch.Clear();
        }

        if (batch.Count > 0)
        {
            await BulkInsertAsync(destConn, batch);
        }

        logger.LogInformation($"[SQL Strategy] Completed Job {job.JobId}. Synced {totalRecords} rows.");
    }
}