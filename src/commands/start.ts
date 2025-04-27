import TelegramBot from "node-telegram-bot-api";
import logger from "../log";

/**
 * 处理 /start 命令
 * @param msg Telegram消息对象
 * @param bot Telegram机器人实例
 */
export function startCommand(msg: TelegramBot.Message, bot: TelegramBot) {
  try {
    const chatId = msg.chat.id;
    const userName = msg.from?.first_name || "用户";

    const text = `欢迎 ${userName} 使用 TRON Sniper Bot! 🚀

🔹 这是一个专为 TRON 区块链设计的交易和狙击工具。

💡 *使用方法*:
- 输入 TRON 代币地址(以T开头)来分析和交易
- 使用 /help 获取更多帮助信息
- 使用 /about 了解更多关于此机器人的信息`;

    // 发送欢迎图片和消息
    bot.sendPhoto(chatId, `https://i.ibb.co/CBFZwn2/TRANCHESBOT-BANNER.png`, {
      caption: text,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📚 帮助", callback_data: "help" },
            { text: "ℹ️ 关于", callback_data: "about" },
          ],
          [{ text: "💱 代币交换", callback_data: "tokenswap_" }],
        ],
      },
    });
    logger.info(`用户 ${userName} (ID: ${msg.from?.id}) 启动了机器人`);
  } catch (error) {
    logger.error(
      `处理 start 命令失败: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "很抱歉，启动机器人时发生错误。请稍后再试。", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
      },
    });
  }
}
