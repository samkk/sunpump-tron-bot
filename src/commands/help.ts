import TelegramBot from "node-telegram-bot-api";
import logger from "../log";

/**
 * 处理 /help 命令
 * @param msg Telegram消息对象
 * @param bot Telegram机器人实例
 */
export function helpCommand(msg: TelegramBot.Message, bot: TelegramBot) {
  try {
    const chatId = msg.chat.id;

    const text = `
🤖 *TRON Sniper Bot 帮助中心*

*可用命令:*
/start - 启动机器人并获取欢迎信息
/help - 显示此帮助信息
/about - 关于本机器人

*功能:*
💱 代币交换 - 在不同代币之间进行直接交换
📊 代币分析 - 分析代币基本信息和价格数据
💰 代币购买 - 使用TRX购买代币
📈 代币监控 - 跟踪代币价格变化

*使用指南:*
1️⃣ 输入TRON代币地址(以T开头)来分析代币
2️⃣ 根据分析结果选择操作(查看图表/购买等)
3️⃣ 设置交易参数(金额/止盈止损)
4️⃣ 监控交易状态和价格变动

*安全提示:*
⚠️ 始终自行验证代币合约安全性
⚠️ 请勿投资超出承受范围的资金
⚠️ 加密货币交易存在高风险

如有任何问题，请联系管理员。
`;

    bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🔙 返回", callback_data: "back_to_menu" },
            { text: "ℹ️ 关于", callback_data: "about" },
          ],
        ],
      },
    });

    logger.info(`用户 ID: ${msg.from?.id} 查看了帮助信息`);
  } catch (error) {
    logger.error(
      `处理 help 命令失败: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "很抱歉，获取帮助信息时发生错误。请稍后再试。", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
      },
    });
  }
}
