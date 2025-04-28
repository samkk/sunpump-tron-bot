import { sendNewTokenNotification, setupBot } from "./bot/bot";
import logger from "./log";
import { RedisService } from "./redis/redis";

// 创建 Redis 服务实例
const redisService = new RedisService();

async function setupRedis() {
  await redisService.connect();
  await redisService.subscribe(
    "trigger-smart-contract-channel",
    async (message) => {
      console.log("收到区块推送:", message);
      const payload = JSON.parse(message);
      await sendNewTokenNotification(payload);
    }
  );
}

async function main(): Promise<void> {
  try {
    logger.info("正在启动应用程序...");
    await Promise.all([setupBot(), setupRedis()]);
    logger.info("应用程序启动成功");
  } catch (error) {
    logger.error("应用程序启动失败:", error);
    process.exit(1);
  }
}

main();
