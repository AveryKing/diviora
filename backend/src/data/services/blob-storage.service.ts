import { Injectable } from '@nestjs/common';
import { BlobServiceClient } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlobStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;

  constructor(private configService: ConfigService) {
    const connectionString =
      this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING') ||
      'UseDevelopmentStorage=true';
    this.containerName = this.configService.get<string>(
      'AZURE_STORAGE_CONTAINER',
      'diviora-data',
    );

    // For development, we'll use connection string. In production, use managed identity
    this.blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
  }

  async uploadFile(fileName: string, data: Buffer): Promise<string> {
    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    await blockBlobClient.upload(data, data.length);
    return blockBlobClient.url;
  }

  async downloadFile(fileName: string): Promise<Buffer> {
    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    const downloadResponse = await blockBlobClient.download();
    const chunks: Buffer[] = [];

    if (downloadResponse.readableStreamBody) {
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
    }
    return Buffer.concat(chunks);
  }

  async deleteFile(fileName: string): Promise<void> {
    const containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.deleteIfExists();
  }
}
