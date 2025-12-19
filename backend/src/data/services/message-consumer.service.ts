import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceBusClient, ServiceBusReceiver } from '@azure/service-bus';
import { DataIngestionService } from './data-ingestion.service';

@Injectable()
export class MessageConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageConsumerService.name);
  private serviceBusClient: ServiceBusClient;
  private receiver: ServiceBusReceiver;
  private queueName: string;
  private isProcessing = false;

  constructor(
    private configService: ConfigService,
    private dataIngestionService: DataIngestionService,
  ) {
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
    this.receiver = this.serviceBusClient.createReceiver(this.queueName);
  }

async onModuleInit() {
  const enabled = this.configService.get<string>('ENABLE_MESSAGE_CONSUMER', 'true');
  
  if (enabled === 'true') {
    this.logger.log('Starting message consumer...');
    this.startProcessing();
  } else {
    this.logger.log('Message consumer disabled via ENABLE_MESSAGE_CONSUMER flag');
  }
}

  async onModuleDestroy() {
    this.logger.log('Stopping message consumer...');
    this.isProcessing = false;
    await this.receiver.close();
    await this.serviceBusClient.close();
  }

  private async startProcessing() {
    this.isProcessing = true;
    this.logger.log(
      `Message consumer started. Listening to queue: ${this.queueName}`,
    );

    // Subscribe to messages
    this.receiver.subscribe({
      processMessage: async (message) => {
        try {
          this.logger.log(
            `Received message: ${message.messageId}`,
            JSON.stringify(message.body),
          );

          const { jobId, blobPath, fileName, fileSize, dataSourceId } =
            message.body;

          // Process the CSV file
          await this.dataIngestionService.processJobFromQueue(
            jobId,
            blobPath,
            {
              fileName,
              fileSize,
              dataSourceId,
              correlationId: message.correlationId?.toString(),
            },
          );

          this.logger.log(`Successfully processed message: ${message.messageId}`);
        } catch (error) {
          this.logger.error(
            `Error processing message ${message.messageId}: ${error.message}`,
            error.stack,
          );
          // Message will be retried or moved to dead letter queue based on Service Bus config
          throw error;
        }
      },
      processError: async (args) => {
        this.logger.error(
          `Error from Service Bus: ${args.error.message}`,
          args.error.stack,
        );
      },
    });

    this.logger.log('Message consumer subscription active');
  }
}