using Diviora.Worker.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Data.SqlClient;
using Dapper;
using System.Text.Json;
using System.Text;

namespace Diviora.Worker.Strategies;

public class DataSourceConfig
{
    public string host { get; set; }
    public string port { get; set; }
    public string database { get; set; }
    public string username { get; set; }
    public string password { get; set; }
}

public class ColumnMapping
{
    public string source { get; set; }
    public string target { get; set; }
}

public class SqlIngestionStrategy(ILogger<SqlIngestionStrategy> logger) : BaseIngestionStrategy
{
    public override async Task ExecuteAsync(JobMessage job)
    {
        logger.LogInformation($"[SQL Strategy] Preparing Job {job.JobId} for DataSource {job.DataSourceId}...");

        try
        {
            string connectionConfigJson;
            await using (var internalConn = new SqlConnection(_sqlConnectionString))
            {
                var sql = "SELECT configuration FROM data_sources WHERE id = @Id";
                connectionConfigJson = await internalConn.QueryFirstOrDefaultAsync<string>(sql, new { Id = job.DataSourceId });
            }

            if (string.IsNullOrEmpty(connectionConfigJson))
            {
                throw new Exception($"DataSource {job.DataSourceId} not found or has no configuration.");
            }

            var config = JsonSerializer.Deserialize<DataSourceConfig>(connectionConfigJson);

            var hostOverride = "localhost";
            var host = string.IsNullOrWhiteSpace(config.host) ? "localhost" : config.host;
            if (!string.IsNullOrWhiteSpace(hostOverride) && (host.Equals("db", StringComparison.OrdinalIgnoreCase) || host.Equals("diviora-db", StringComparison.OrdinalIgnoreCase)))
            {
                host = hostOverride;
            }

            var port = string.IsNullOrWhiteSpace(config.port) ? "1433" : config.port;
            var database = string.IsNullOrWhiteSpace(config.database) ? "diviora" : config.database;
            var dataSource = string.IsNullOrWhiteSpace(port) ? host : $"{host},{port}";

            var builder = new SqlConnectionStringBuilder
            {
                DataSource = dataSource,
                InitialCatalog = database,
                UserID = config.username,
                Password = config.password,
                TrustServerCertificate = true,
                Encrypt = false
            };
            var sourceConnectionString = builder.ConnectionString;

            logger.LogInformation($"[SQL Strategy] Connected to external DB: {config.host}. Streaming table: {job.FileName}...");

            await UpdateJobStatusAsync(job.JobId, "processing", 0);

            await using var sourceConn = new SqlConnection(sourceConnectionString);
            await sourceConn.OpenAsync();

            await using var destConn = new SqlConnection(_sqlConnectionString);
            await destConn.OpenAsync();

            var batch = new List<ProcessedData>();
            var batchSize = 1000;
            var totalRecords = 0;

            var query = BuildQuery(job);
            
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
                    DataSourceId = job.DataSourceId,
                    RowNumber = totalRecords,
                    Data = jsonData,
                    SourceFileName = job.FileName,
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

            await UpdateJobStatusAsync(job.JobId, "completed", totalRecords);
            logger.LogInformation($"[SQL Strategy] SUCCESS: Job {job.JobId} synced {totalRecords} rows.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"[SQL Strategy] FAILED: Job {job.JobId}");
            await UpdateJobStatusAsync(job.JobId, "failed", 0, ex.Message);
            throw; // Re-throw to ensure Service Bus handles the retry policy
        }
    }

    private async Task UpdateJobStatusAsync(int jobId, string status, int records, string errorMessage = null)
    {
        try 
        {
            await using var conn = new SqlConnection(_sqlConnectionString);
            var table = "[data_ingestion_job]"; // TypeORM default table name for DataIngestionJob
            var sql = $@"
                UPDATE {table}
                SET status = @Status, 
                    recordsProcessed = @Records,
                    errorMessage = @Error,
                    startedAt = CASE WHEN @Status = 'processing' THEN ISNULL(startedAt, GETUTCDATE()) ELSE startedAt END,
                    completedAt = @CompletedAt,
                    updatedAt = GETUTCDATE()
                WHERE id = @Id";

            var affected = await conn.ExecuteAsync(sql, new { 
                Id = jobId, 
                Status = status, 
                Records = records,
                Error = errorMessage,
                CompletedAt = status == "completed" || status == "failed" ? (DateTime?)DateTime.UtcNow : null
            });

            if (affected == 0)
            {
                logger.LogWarning("UpdateJobStatusAsync could not find job {JobId} in table DataIngestionJob", jobId);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update job status in database.");
        }
    }

    private string BuildQuery(JobMessage job)
    {
        if (!job.Metadata.TryGetValue("columnMapping", out var mappingObj))
        {
            return $"SELECT * FROM {job.FileName}";
        }

        try 
        {
            var mappingJson = mappingObj.ToString();

            if (string.IsNullOrEmpty(mappingJson)) 
                return $"SELECT * FROM {job.FileName}";

            var mappings = JsonSerializer.Deserialize<List<ColumnMapping>>(
                mappingJson, 
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );
            
            if (mappings == null || mappings.Count == 0)
                return $"SELECT * FROM {job.FileName}";

            var sb = new StringBuilder("SELECT ");
            for (var i = 0; i < mappings.Count; i++)
            {
                var map = mappings[i];
                var sourceCol = map.source.Replace("]", ""); 
                var targetCol = map.target.Replace("]", "");

                sb.Append($"[{sourceCol}] AS [{targetCol}]");
                
                if (i < mappings.Count - 1) sb.Append(", ");
            }
            
            sb.Append($" FROM {job.FileName}");
            return sb.ToString();
        }
        catch (Exception ex)
        {
            logger.LogWarning($"Failed to parse column mappings: {ex.Message}. Reverting to SELECT *");
            return $"SELECT * FROM {job.FileName}";
        }
    }
}