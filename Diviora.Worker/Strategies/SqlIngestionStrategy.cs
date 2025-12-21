using Diviora.Worker.Models;

namespace Diviora.Worker.Strategies;

public class SqlIngestionStrategy(ILogger<SqlIngestionStrategy> logger) : BaseIngestionStrategy
{
    private readonly ILogger<SqlIngestionStrategy> _logger = logger;

    public override Task ExecuteAsync(JobMessage job)
    {
        throw new NotImplementedException();
    }
}