namespace Diviora.Worker.Models
{
    public class ProcessedData
    {
        public int JobId { get; set; }
        public int RowNumber { get; set; }
        public string Data { get; set; } = string.Empty; // Stores the JSON row
        public string SourceFileName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}