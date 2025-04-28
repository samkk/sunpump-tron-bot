import Redis, { Redis as IRedis } from "ioredis";

export class RedisService {
  private redis: IRedis;

  constructor() {
    this.redis = new Redis({
      host: "127.0.0.1",
      port: 6379,
    });
  }

  // 连接 Redis
  async connect(): Promise<void> {
    try {
      await this.redis.ping();
      console.log("成功连接到 Redis");
    } catch (error) {
      console.error("Redis 连接失败:", error);
      throw error;
    }
  }

  // 发布消息
  async publish(channel: string, message: string): Promise<void> {
    try {
      await this.redis.publish(channel, message);
      console.log(`消息已发布到频道 ${channel}: ${message}`);
    } catch (error) {
      console.error(`发布消息失败: ${error}`);
    }
  }

  // 订阅频道
  async subscribe(
    channel: string,
    callback: (message: string) => void
  ): Promise<void> {
    try {
      await this.redis.subscribe(channel);
      console.log(`已订阅频道 ${channel}`);

      this.redis.on("message", (ch, message) => {
        if (ch === channel) {
          callback(message); // 接收到消息后执行回调
        }
      });
    } catch (error) {
      console.error(`订阅频道失败: ${error}`);
    }
  }

  // 获取数据
  async get(key: string): Promise<string | null> {
    try {
      const value = await this.redis.get(key);
      return value;
    } catch (error) {
      console.error(`获取键 ${key} 的值失败: ${error}`);
      return null;
    }
  }

  // 设置数据
  async set(key: string, value: string): Promise<"OK" | null> {
    try {
      const result = await this.redis.set(key, value);
      return result;
    } catch (error) {
      console.error(`设置键 ${key} 的值失败: ${error}`);
      return null;
    }
  }

  // 关闭 Redis 连接
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      console.log("Redis 连接已关闭");
    } catch (error) {
      console.error("关闭 Redis 连接失败:", error);
    }
  }
}
