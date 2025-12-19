using Microsoft.Extensions.DependencyInjection;
using Diviora.Worker.Models;

namespace Diviora.Worker.Strategies
{
    public class JobStrategyFactory
    {
        private readonly IServiceProvider _serviceProvider;

        public JobStrategyFactory(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        public IJobStrategy GetStrategy(JobMessage job)
        {
            return job.FileType.ToLower() switch
            {
                "csv" => _serviceProvider.GetRequiredService<CsvIngestionStrategy>(),
                // "json" => _serviceProvider.GetRequiredService<JsonIngestionStrategy>(),
                // "xml" => _serviceProvider.GetRequiredService<XmlIngestionStrategy>(),
                _ => throw new ArgumentException($"No strategy found for file type: {job.FileType}")
            };
        }
    }
}