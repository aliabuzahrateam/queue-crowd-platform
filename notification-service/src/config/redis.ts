import { createClient, RedisClientType } from 'redis';

export interface RedisConfig {
  url: string;
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export class RedisService {
  private client: RedisClientType;
  private subscriber: RedisClientType;
  private publisher: RedisClientType;

  constructor() {
    const config: RedisConfig = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    };

    this.client = createClient({
      url: config.url,
      socket: {
        host: config.host,
        port: config.port
      },
      password: config.password,
      database: config.db
    });

    this.subscriber = this.client.duplicate();
    this.publisher = this.client.duplicate();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });

    this.subscriber.on('error', (err) => {
      console.error('Redis Subscriber Error:', err);
    });

    this.publisher.on('error', (err) => {
      console.error('Redis Publisher Error:', err);
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.subscriber.connect();
    await this.publisher.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
    await this.subscriber.disconnect();
    await this.publisher.disconnect();
  }

  // Cache operations
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    return await this.client.expire(key, seconds);
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<number> {
    return await this.client.hSet(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hGet(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hGetAll(key);
  }

  async hdel(key: string, field: string): Promise<number> {
    return await this.client.hDel(key, field);
  }

  // List operations
  async lpush(key: string, value: string): Promise<number> {
    return await this.client.lPush(key, value);
  }

  async rpush(key: string, value: string): Promise<number> {
    return await this.client.rPush(key, value);
  }

  async lpop(key: string): Promise<string | null> {
    return await this.client.lPop(key);
  }

  async rpop(key: string): Promise<string | null> {
    return await this.client.rPop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.lRange(key, start, stop);
  }

  // Set operations
  async sadd(key: string, member: string): Promise<number> {
    return await this.client.sAdd(key, member);
  }

  async srem(key: string, member: string): Promise<number> {
    return await this.client.sRem(key, member);
  }

  async smembers(key: string): Promise<string[]> {
    return await this.client.sMembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    return await this.client.sIsMember(key, member);
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    return await this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel, callback);
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel);
  }

  // Notification-specific methods
  async cacheNotificationPreferences(userId: string, preferences: any): Promise<void> {
    const key = `notification_preferences:${userId}`;
    await this.set(key, JSON.stringify(preferences), 3600); // 1 hour TTL
  }

  async getNotificationPreferences(userId: string): Promise<any | null> {
    const key = `notification_preferences:${userId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async cacheUserTokens(userId: string, tokens: string[]): Promise<void> {
    const key = `user_tokens:${userId}`;
    await this.sadd(key, ...tokens);
    await this.expire(key, 86400); // 24 hours TTL
  }

  async getUserTokens(userId: string): Promise<string[]> {
    const key = `user_tokens:${userId}`;
    return await this.smembers(key);
  }

  async addUserToken(userId: string, token: string): Promise<void> {
    const key = `user_tokens:${userId}`;
    await this.sadd(key, token);
    await this.expire(key, 86400); // 24 hours TTL
  }

  async removeUserToken(userId: string, token: string): Promise<void> {
    const key = `user_tokens:${userId}`;
    await this.srem(key, token);
  }

  async publishNotificationEvent(event: {
    type: string;
    userId: string;
    notificationId: string;
    data: any;
  }): Promise<void> {
    const channel = 'notifications';
    const message = JSON.stringify(event);
    await this.publish(channel, message);
  }

  async subscribeToNotificationEvents(callback: (event: any) => void): Promise<void> {
    await this.subscribe('notifications', (message) => {
      try {
        const event = JSON.parse(message);
        callback(event);
      } catch (error) {
        console.error('Error parsing notification event:', error);
      }
    });
  }
}

export const redisService = new RedisService(); 