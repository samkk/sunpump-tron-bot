import TelegramBot from "node-telegram-bot-api";
import logger from "../log";

/**
 * 处理 /about 命令
 * @param msg Telegram消息对象
 * @param bot Telegram机器人实例
 */
export function aboutCommand(msg: TelegramBot.Message, bot: TelegramBot) {
  try {
    const chatId = msg.chat.id;

    const text = `
*关于 TRON Sniper Bot*

TRON Sniper Bot 是一个专为 TRON 区块链设计的代币交易和狙击工具。

*主要功能:*
✅ 自动扫描区块链，监控新代币创建
✅ 实时获取代币价格和流动性信息
✅ 快速执行买入交易，抢先参与投资机会

*技术特点:*
🔹 基于 Node.js 构建，高性能运行
🔹 连接 TRON 区块链，实时监控交易
🔹 使用 Telegram Bot API 提供便捷的用户界面
🔹 安全的交易管理和资金保护

版本: 1.0.0
开发者: Novacode
`;

    bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🔙 返回", callback_data: "back_to_menu" },
            { text: "📚 帮助", callback_data: "help" },
          ],
        ],
      },
    });

    logger.info(`用户 ID: ${msg.from?.id} 查看了关于信息`);
  } catch (error) {
    logger.error(
      `处理 about 命令失败: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "很抱歉，获取关于信息时发生错误。请稍后再试。", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
      },
    });
  }
}
