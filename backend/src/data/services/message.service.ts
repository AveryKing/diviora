import { Injectable } from '@nestjs/common';
import { ServiceBusClient, ServiceBusSender } from '@azure/service-bus';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MessageService {
  private serviceBusClient: ServiceBusClient;
  private sender: ServiceBusSender;

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>(
      'AZURE_SERVICE_BUS_CONNECTION_STRING',
    );
    const queueName = this.configService.get<string>(
      'AZURE_SERVICE_BUS_QUEUE',
      'data-processing',
    );

    if (!connectionString) {
      throw new Error('AZURE_SERVICE_BUS_CONNECTION_STRING is required');
    }

    this.serviceBusClient = new ServiceBusClient(connectionString);
    this.sender = this.serviceBusClient.createSender(queueName);
  }

  async sendDataProcessingMessage(
    jobId: number,
    blobPath: string,
  ): Promise<void> {
    const message = {
      body: {
        jobId,
        blobPath,
        timestamp: new Date().toISOString(),
      },
    };

    await this.sender.sendMessages(message);
  }
}
