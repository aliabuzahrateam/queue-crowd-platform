import { Client } from '@elastic/elasticsearch';

export interface ElasticsearchConfig {
  node: string;
  auth: {
    username: string;
    password: string;
  };
  index: string;
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  message: string;
  data?: any;
  userId?: string;
  notificationId?: string;
}

export interface NotificationMetrics {
  totalSent: number;
  emailSent: number;
  smsSent: number;
  pushSent: number;
  failedDeliveries: number;
  averageDeliveryTime: number;
  successRate: number;
  timestamp: Date;
}

export class ElasticsearchService {
  private client: Client;
  private config: ElasticsearchConfig;

  constructor() {
    this.config = {
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
      },
      index: process.env.ELASTICSEARCH_INDEX || 'notification-logs'
    };

    this.client = new Client({
      node: this.config.node,
      auth: this.config.auth,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.ping();
      console.log('Elasticsearch connected successfully');
    } catch (error) {
      console.error('Elasticsearch connection failed:', error);
      throw error;
    }
  }

  async createIndexIfNotExists(): Promise<void> {
    try {
      const indexExists = await this.client.indices.exists({
        index: this.config.index
      });

      if (!indexExists) {
        await this.client.indices.create({
          index: this.config.index,
          body: {
            mappings: {
              properties: {
                timestamp: { type: 'date' },
                level: { type: 'keyword' },
                service: { type: 'keyword' },
                message: { type: 'text' },
                data: { type: 'object' },
                userId: { type: 'keyword' },
                notificationId: { type: 'keyword' }
              }
            },
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0
            }
          }
        });

        console.log(`Created index: ${this.config.index}`);
      }
    } catch (error) {
      console.error('Failed to create index:', error);
      throw error;
    }
  }

  async log(entry: LogEntry): Promise<void> {
    try {
      await this.client.index({
        index: this.config.index,
        body: {
          timestamp: entry.timestamp,
          level: entry.level,
          service: entry.service,
          message: entry.message,
          data: entry.data,
          userId: entry.userId,
          notificationId: entry.notificationId
        }
      });
    } catch (error) {
      console.error('Failed to log to Elasticsearch:', error);
    }
  }

  async searchLogs(query: {
    level?: string;
    service?: string;
    userId?: string;
    notificationId?: string;
    startDate?: Date;
    endDate?: Date;
    size?: number;
  }): Promise<LogEntry[]> {
    try {
      const must: any[] = [];

      if (query.level) {
        must.push({ term: { level: query.level } });
      }

      if (query.service) {
        must.push({ term: { service: query.service } });
      }

      if (query.userId) {
        must.push({ term: { userId: query.userId } });
      }

      if (query.notificationId) {
        must.push({ term: { notificationId: query.notificationId } });
      }

      if (query.startDate || query.endDate) {
        const range: any = {};
        if (query.startDate) range.gte = query.startDate;
        if (query.endDate) range.lte = query.endDate;
        must.push({ range: { timestamp: range } });
      }

      const response = await this.client.search({
        index: this.config.index,
        body: {
          query: {
            bool: { must }
          },
          sort: [{ timestamp: { order: 'desc' } }],
          size: query.size || 100
        }
      });

      return response.hits.hits.map((hit: any) => hit._source as LogEntry);
    } catch (error) {
      console.error('Failed to search logs:', error);
      return [];
    }
  }

  async getNotificationMetrics(timeRange: {
    startDate: Date;
    endDate: Date;
  }): Promise<NotificationMetrics> {
    try {
      const response = await this.client.search({
        index: this.config.index,
        body: {
          query: {
            bool: {
              must: [
                { term: { service: 'notification-service' } },
                {
                  range: {
                    timestamp: {
                      gte: timeRange.startDate,
                      lte: timeRange.endDate
                    }
                  }
                }
              ]
            }
          },
          aggs: {
            total_sent: {
              filter: { term: { level: 'info' } }
            },
            email_sent: {
              filter: {
                bool: {
                  must: [
                    { term: { level: 'info' } },
                    { match: { message: 'email sent' } }
                  ]
                }
              }
            },
            sms_sent: {
              filter: {
                bool: {
                  must: [
                    { term: { level: 'info' } },
                    { match: { message: 'sms sent' } }
                  ]
                }
              }
            },
            push_sent: {
              filter: {
                bool: {
                  must: [
                    { term: { level: 'info' } },
                    { match: { message: 'push notification sent' } }
                  ]
                }
              }
            },
            failed_deliveries: {
              filter: { term: { level: 'error' } }
            }
          }
        }
      });

      const aggs = response.aggregations as any;
      const totalSent = aggs.total_sent.doc_count;
      const emailSent = aggs.email_sent.doc_count;
      const smsSent = aggs.sms_sent.doc_count;
      const pushSent = aggs.push_sent.doc_count;
      const failedDeliveries = aggs.failed_deliveries.doc_count;

      const successRate = totalSent > 0 ? ((totalSent - failedDeliveries) / totalSent) * 100 : 0;

      return {
        totalSent,
        emailSent,
        smsSent,
        pushSent,
        failedDeliveries,
        averageDeliveryTime: 0, // Would need more detailed tracking
        successRate,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Failed to get notification metrics:', error);
      return {
        totalSent: 0,
        emailSent: 0,
        smsSent: 0,
        pushSent: 0,
        failedDeliveries: 0,
        averageDeliveryTime: 0,
        successRate: 0,
        timestamp: new Date()
      };
    }
  }

  async getErrorLogs(timeRange: {
    startDate: Date;
    endDate: Date;
  }): Promise<LogEntry[]> {
    return this.searchLogs({
      level: 'error',
      startDate: timeRange.startDate,
      endDate: timeRange.endDate,
      size: 1000
    });
  }

  async getServiceLogs(service: string, timeRange: {
    startDate: Date;
    endDate: Date;
  }): Promise<LogEntry[]> {
    return this.searchLogs({
      service,
      startDate: timeRange.startDate,
      endDate: timeRange.endDate,
      size: 1000
    });
  }

  async getUserNotificationLogs(userId: string, timeRange: {
    startDate: Date;
    endDate: Date;
  }): Promise<LogEntry[]> {
    return this.searchLogs({
      userId,
      startDate: timeRange.startDate,
      endDate: timeRange.endDate,
      size: 1000
    });
  }
}

export const elasticsearchService = new ElasticsearchService(); 