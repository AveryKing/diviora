using Diviora.Worker.Models;

namespace Diviora.Worker.Strategies
{
    public interface IJobStrategy
    {
        Task ExecuteAsync(JobMessage job);
    }
}