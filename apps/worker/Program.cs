using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Diviora.Worker.Strategies;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults() 
    .ConfigureServices(services =>
    {
        services.AddSingleton<JobStrategyFactory>();
        services.AddTransient<CsvIngestionStrategy>();
        services.AddTransient<SqlIngestionStrategy>();
        
        services.AddLogging();
    })
    .Build();

host.Run();