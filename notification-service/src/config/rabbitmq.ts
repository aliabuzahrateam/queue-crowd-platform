import amqp, { Channel, Connection, Message } from 'amqplib';

export interface RabbitMQConfig {
  url: string;
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface QueueMessage {
  type: string;
  data: any;
  timestamp: Date;
  id: string;
}

export class RabbitMQService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private config: RabbitMQConfig;

  constructor() {
    this.config = {
      url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      host: process.env.RABBITMQ_HOST || 'localhost',
      port: parseInt(process.env.RABBITMQ_PORT || '5672'),
      username: process.env.RABBITMQ_USERNAME || 'admin',
      password: process.env.RABBITMQ_PASSWORD || 'admin123'
    };
  }

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect({
        hostname: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password
      });

      this.channel = await this.connection.createChannel();

      // Declare exchanges
      await this.channel.assertExchange('notifications', 'topic', { durable: true });
      await this.channel.assertExchange('events', 'fanout', { durable: true });

      // Declare queues
      await this.channel.assertQueue('email_notifications', { durable: true });
      await this.channel.assertQueue('sms_notifications', { durable: true });
      await this.channel.assertQueue('push_notifications', { durable: true });
      await this.channel.assertQueue('notification_events', { durable: true });

      // Bind queues to exchanges
      await this.channel.bindQueue('email_notifications', 'notifications', 'email.*');
      await this.channel.bindQueue('sms_notifications', 'notifications', 'sms.*');
      await this.channel.bindQueue('push_notifications', 'notifications', 'push.*');
      await this.channel.bindQueue('notification_events', 'events', '');

      console.log('RabbitMQ connected successfully');
    } catch (error) {
      console.error('RabbitMQ connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }

  async publishMessage(queue: string, message: QueueMessage): Promise<boolean> {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      await this.channel.assertQueue(queue, { durable: true });
      const success = this.channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      return success;
    } catch (error) {
      console.error('Failed to publish message:', error);
      return false;
    }
  }

  async publishNotification(routingKey: string, message: QueueMessage): Promise<boolean> {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      const success = this.channel.publish(
        'notifications',
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      return success;
    } catch (error) {
      console.error('Failed to publish notification:', error);
      return false;
    }
  }

  async publishEvent(event: QueueMessage): Promise<boolean> {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      const success = this.channel.publish(
        'events',
        '',
        Buffer.from(JSON.stringify(event)),
        { persistent: true }
      );

      return success;
    } catch (error) {
      console.error('Failed to publish event:', error);
      return false;
    }
  }

  async consumeMessages(queue: string, callback: (message: QueueMessage) => Promise<void>): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      await this.channel.assertQueue(queue, { durable: true });

      this.channel.consume(queue, async (msg: Message | null) => {
        if (msg) {
          try {
            const message: QueueMessage = JSON.parse(msg.content.toString());
            await callback(message);
            this.channel?.ack(msg);
          } catch (error) {
            console.error('Error processing message:', error);
            this.channel?.nack(msg, false, true);
          }
        }
      });

      console.log(`Started consuming messages from queue: ${queue}`);
    } catch (error) {
      console.error('Failed to start consuming messages:', error);
      throw error;
    }
  }

  // Notification-specific methods
  async publishEmailNotification(data: {
    to: string;
    subject: string;
    template: string;
    templateData: any;
  }): Promise<boolean> {
    const message: QueueMessage = {
      type: 'email_notification',
      data,
      timestamp: new Date(),
      id: `email_${Date.now()}_${Math.random()}`
    };

    return this.publishNotification('email.send', message);
  }

  async publishSMSNotification(data: {
    to: string;
    message: string;
    template: string;
    templateData: any;
  }): Promise<boolean> {
    const message: QueueMessage = {
      type: 'sms_notification',
      data,
      timestamp: new Date(),
      id: `sms_${Date.now()}_${Math.random()}`
    };

    return this.publishNotification('sms.send', message);
  }

  async publishPushNotification(data: {
    tokens: string[];
    title: string;
    body: string;
    data: any;
  }): Promise<boolean> {
    const message: QueueMessage = {
      type: 'push_notification',
      data,
      timestamp: new Date(),
      id: `push_${Date.now()}_${Math.random()}`
    };

    return this.publishNotification('push.send', message);
  }

  async publishNotificationEvent(event: {
    type: string;
    userId: string;
    notificationId: string;
    data: any;
  }): Promise<boolean> {
    const message: QueueMessage = {
      type: 'notification_event',
      data: event,
      timestamp: new Date(),
      id: `event_${Date.now()}_${Math.random()}`
    };

    return this.publishEvent(message);
  }

  // Start consumers for different notification types
  async startEmailConsumer(processEmail: (data: any) => Promise<void>): Promise<void> {
    await this.consumeMessages('email_notifications', async (message) => {
      if (message.type === 'email_notification') {
        await processEmail(message.data);
      }
    });
  }

  async startSMSConsumer(processSMS: (data: any) => Promise<void>): Promise<void> {
    await this.consumeMessages('sms_notifications', async (message) => {
      if (message.type === 'sms_notification') {
        await processSMS(message.data);
      }
    });
  }

  async startPushConsumer(processPush: (data: any) => Promise<void>): Promise<void> {
    await this.consumeMessages('push_notifications', async (message) => {
      if (message.type === 'push_notification') {
        await processPush(message.data);
      }
    });
  }

  async startEventConsumer(processEvent: (data: any) => Promise<void>): Promise<void> {
    await this.consumeMessages('notification_events', async (message) => {
      if (message.type === 'notification_event') {
        await processEvent(message.data);
      }
    });
  }
}

export const rabbitMQService = new RabbitMQService(); 