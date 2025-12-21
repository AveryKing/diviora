using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Diviora.Worker.Strategies;
using Diviora.Worker.Models;
using System.Text.Json;

namespace Diviora.Worker.Functions
{
    public class JobDispatcher
    {
        private readonly ILogger<JobDispatcher> _logger;
        private readonly JobStrategyFactory _strategyFactory;

        public JobDispatcher(ILogger<JobDispatcher> logger, JobStrategyFactory strategyFactory)
        {
            _logger = logger;
            _strategyFactory = strategyFactory;
        }

        [Function(nameof(JobDispatcher))]
        public async Task Run([ServiceBusTrigger("data-processing", Connection = "AzureWebJobsServiceBus")] string messageBody)
        {
            try 
            {
                var jobMessage = JsonSerializer.Deserialize<JobMessage>(messageBody);
                
                if (jobMessage == null) 
                {
                    _logger.LogError("Received empty or invalid message body");
                    return;
                }

                _logger.LogInformation($"Received Job {jobMessage.JobId} (Source: {jobMessage.DataSourceId})");

                var strategy = _strategyFactory.GetStrategy(jobMessage);

                await strategy.ExecuteAsync(jobMessage);
                
                _logger.LogInformation($"Job {jobMessage.JobId} processed successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Fatal error processing job.");
                throw; // ensures retry
            }
        }
    }
}