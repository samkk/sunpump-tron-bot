import { BlockchainScanner } from "./blockchainScanner";
import { sendNewTokenNotification, setupBot } from "./bot/bot";
import logger from "./log";

/**
 * 启动区块链扫描器
 */
async function initializeBlockchainScanner(): Promise<BlockchainScanner> {
  try {
    logger.info("初始化区块链扫描器...");
    const scanner = new BlockchainScanner();
    await scanner.initialize();

    // 监听新代币事件
    scanner.on("newToken", async (tokenInfo) => {
      try {
        logger.info(
          `准备发送新代币通知: ${tokenInfo.name} (${tokenInfo.address})`
        );
        await sendNewTokenNotification(tokenInfo);
      } catch (err) {
        logger.error(
          `发送新代币通知失败: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    });

    // 启动扫描
    await scanner.start();
    logger.info("区块链扫描器已启动，正在监听新的代币交易对创建...");
    // 处理退出信号
    process.on("SIGINT", () => {
      logger.info("\n正在停止扫描器...");
      scanner.stop();
      logger.info("扫描器已停止");
      process.exit(0);
    });

    return scanner;
  } catch (error) {
    logger.error(
      `启动扫描器失败: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    logger.info("正在启动应用程序...");
    await Promise.all([setupBot(), initializeBlockchainScanner()]);
    logger.info("应用程序启动成功");
  } catch (error) {
    logger.error("应用程序启动失败:", error);
    process.exit(1);
  }
}

main();
