using Dapper;
using Diviora.Worker.Models;
using Microsoft.Data.SqlClient;

namespace Diviora.Worker.Strategies;

public abstract class BaseIngestionStrategy : IJobStrategy
{
    protected readonly string _sqlConnectionString = Environment.GetEnvironmentVariable("SqlConnectionString") ?? "";

    public abstract Task ExecuteAsync(JobMessage job);
    
    protected async Task BulkInsertAsync(SqlConnection conn, List<ProcessedData> data)
    {
        var sql = @"INSERT INTO processed_data (jobId, rowNumber, data, sourceFileName, createdAt) 
                        VALUES (@JobId, @RowNumber, @Data, @SourceFileName, @CreatedAt)";

        using var transaction = conn.BeginTransaction();
        try
        {
            await conn.ExecuteAsync(sql, data, transaction: transaction);
            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }
}