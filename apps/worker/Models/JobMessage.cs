using System.Text.Json.Serialization;

namespace Diviora.Worker.Models
{
    // must match the JSON sent by  NestJS API
    public class JobMessage
    {
        [JsonPropertyName("jobId")]
        public int JobId { get; set; }

        [JsonPropertyName("blobPath")]
        public string BlobPath { get; set; } = string.Empty;

        [JsonPropertyName("dataSourceId")]
        public int DataSourceId { get; set; }

        [JsonPropertyName("fileName")]
        public string FileName { get; set; } = string.Empty;
        
        [JsonPropertyName("fileType")]
        public string FileType { get; set; } = string.Empty;
        
        [JsonExtensionData]
        public Dictionary<string, object> Metadata { get; set; } = new Dictionary<string, object>();
        
    }
}