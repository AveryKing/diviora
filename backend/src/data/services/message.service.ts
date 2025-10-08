import { Injectable, Logger } from '@nestjs/common';
import { ServiceBusClient, ServiceBusSender } from '@azure/service-bus';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);
  private serviceBusClient: ServiceBusClient;
  private sender: ServiceBusSender;
  private queueName: string;

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>(
      'AZURE_SERVICE_BUS_CONNECTION_STRING',
    );
    this.queueName = this.configService.get<string>(
      'AZURE_SERVICE_BUS_QUEUE',
      'data-processing',
    );

    if (!connectionString) {
      throw new Error('AZURE_SERVICE_BUS_CONNECTION_STRING is required');
    }

    this.serviceBusClient = new ServiceBusClient(connectionString);
    this.sender = this.serviceBusClient.createSender(this.queueName);
  }

  async sendDataProcessingMessage(
    jobId: number,
    blobPath: string,
    additionalData?: Record<string, any>,
  ): Promise<string> {
    const correlationId = uuidv4();

    const message = {
      body: {
        jobId,
        blobPath,
        timestamp: new Date().toISOString(),
        correlationId,
        ...additionalData,
      },
      messageId: correlationId,
      correlationId,
      subject: 'data-processing',
    };

    try {
      await this.sender.sendMessages(message);

      this.logger.log(`Message sent successfully`, {
        jobId,
        correlationId,
        queueName: this.queueName,
      });

      return correlationId;
    } catch (error) {
      this.logger.error(`Failed to send message to Service Bus`, {
        error: error.message,
        jobId,
        correlationId,
        queueName: this.queueName,
      });
      throw new Error(`Failed to send Service Bus message: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    try {
      await this.sender.close();
      await this.serviceBusClient.close();
      this.logger.log('Service Bus connections closed');
    } catch (error) {
      this.logger.error(
        `Error closing Service Bus connections: ${error.message}`,
      );
      throw error;
    }
  }
}
