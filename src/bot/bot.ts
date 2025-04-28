import TelegramBot from "node-telegram-bot-api";
import { aboutCommand, helpCommand, startCommand } from "../commands";
import logger from "../log";
import { validateAddress } from "../utils/tronUtils";
import SniperUtils from "../utils/tronWeb";

// 获取Telegram机器人Token
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not defined in .env file");
}
// 创建机器人实例
const bot = new TelegramBot(token, { polling: false });
// 存储订阅新代币通知的用户ID列表
let newTokenSubscribers: number[] = [-1002586678867];

/**
 * 发送新代币通知给所有订阅用户
 * @param tokenInfo 代币信息对象
 */
async function sendNewTokenNotification(tokenInfo: {
  address: string;
  creator?: string;
  name: string;
  symbol: string;
  decimals: number;
}): Promise<void> {
  try {
    if (newTokenSubscribers.length === 0) {
      logger.info("没有用户订阅新代币通知，跳过发送");
      return;
    }

    const message = `
🚨 *检测到新代币创建!* 🚨

🪙 *代币信息:*
📝 名称: \`${tokenInfo.name}\`
🔤 符号: \`${tokenInfo.symbol}\`
🔢 精度: \`${tokenInfo.decimals}\`
👤 创建者: \`${tokenInfo.creator || "未知"}\`
⏰ 创建时间: \`${new Date().toLocaleString()}\`

📋 代币地址: \`${tokenInfo.address}\`
🔗 查看链接: [Tronscan](https://tronscan.org/#/token20/${tokenInfo.address})

🔘 *可用操作:*
`;

    const promises = newTokenSubscribers.map((chatId) => {
      return bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: false,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📈 查看图表",
                callback_data: `chart_${tokenInfo.address}`,
              },
              { text: "💰 购买", callback_data: `buy_${tokenInfo.address}` },
            ],
          ],
        },
      });
    });

    await Promise.all(promises);
    logger.info(`已向 ${newTokenSubscribers.length} 个用户发送新代币通知`);
  } catch (error) {
    logger.error(
      `发送新代币通知失败: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// 命令列表
const commands = [
  { command: "start", description: "启动机器人并获取欢迎信息" },
  { command: "help", description: "获取帮助信息" },
  { command: "about", description: "关于本机器人" },
];

/**
 * 注册所有命令处理程序
 */
function registerCommandHandlers() {
  // 处理 /start 命令
  bot.onText(/\/start/, (msg) => {
    startCommand(msg, bot);
  });

  // 处理 /help 命令
  bot.onText(/\/help/, (msg) => {
    helpCommand(msg, bot);
  });

  // 处理 /about 命令
  bot.onText(/\/about/, (msg) => {
    aboutCommand(msg, bot);
  });
}

/**
 * 处理文本消息（非命令）
 */
function handleTextMessages() {
  bot.on("message", async (msg) => {
    // 如果是命令则忽略
    if (msg.text && msg.text.startsWith("/")) return;
    // 处理可能的代币地址
    if (msg.text && (await validateAddress(msg.text))) {
      const tokenAddress = msg.text;
      const chatId = msg.chat.id;
      // 发送正在处理的消息，并保存消息ID以便后续删除
      const processingMessage = await bot.sendMessage(
        chatId,
        `🔍 正在分析代币地址: \`${tokenAddress}\`...`,
        {
          parse_mode: "Markdown",
        }
      );
      // 这里可以添加代币分析逻辑
      // 例如查询代币信息，显示价格，提供交易选项等
      // 临时响应
      const tokenInfo = await SniperUtils.getSunpumpTokenInformations(
        tokenAddress
      );

      bot
        .deleteMessage(chatId, processingMessage.message_id)
        .catch((err) => logger.error(`删除消息失败: ${err.message}`));

      if (!tokenInfo) {
        bot.sendMessage(
          chatId,
          `❌ *无法获取代币信息*\n\n未找到地址为 \`${tokenAddress}\` 的代币信息，请确认地址是否正确。`,
          { parse_mode: "Markdown" }
        );
        return;
      }

      // 格式化日期
      const formatDate = (date: Date | null) => {
        if (!date) return "未知";
        return date.toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      // 格式化数字
      const formatNumber = (num: number | undefined, digits: number = 2) => {
        if (num === undefined || num === null) return "未知";
        return num.toLocaleString("zh-CN", {
          maximumFractionDigits: digits,
        });
      };

      const priceChangeEmoji = tokenInfo.priceChange24Hr
        ? tokenInfo.priceChange24Hr > 0
          ? "🟢"
          : "🔴"
        : "➖";

      bot.sendMessage(
        chatId,
        `
📊 *代币分析结果*

🪙 *基本信息:*
📝 名称: \`${tokenInfo.name || "未知"}\`
🔤 符号: \`${tokenInfo.symbol || "未知"}\`
🔢 精度: \`${tokenInfo.decimals || "未知"}\`
🔗 合约地址: \`${tokenInfo.contractAddress || tokenAddress}\`
🌐 交易池地址: \`${tokenInfo.swapPoolAddress || "未知"}\`

💰 *价格信息:*
💲 价格: \`${formatNumber(tokenInfo.priceInTrx, 8)} TRX (${formatNumber(
          tokenInfo.priceInTrx * (tokenInfo.trxPriceInUsd || 0),
          8
        )} USD)\`
📈 24h变化: ${priceChangeEmoji} \`${formatNumber(tokenInfo.priceChange24Hr)}%\`
💹 市值: \`${formatNumber(tokenInfo.marketCap)} USD\`
💧 流动性: \`${formatNumber(tokenInfo.virtualLiquidity)} TRX\`
📊 24h交易量: \`${formatNumber(tokenInfo.volume24Hr)} TRX\`
👥 持有人数: \`${tokenInfo.holders || "未知"}\`

⏰ *时间信息:*
🏭 创建时间: \`${formatDate(tokenInfo.tokenCreatedTime)}\`
🚀 启动时间: \`${formatDate(tokenInfo.tokenLaunchedTime)}\`

🔗 *链接:*
${tokenInfo.websiteUrl ? `🌐 网站: [点击访问](${tokenInfo.websiteUrl})` : ""}
${
  tokenInfo.telegramUrl ? `💬 电报群: [点击加入](${tokenInfo.telegramUrl})` : ""
}
${tokenInfo.twitterUrl ? `🐦 推特: [点击关注](${tokenInfo.twitterUrl})` : ""}

🔘 *可用操作*:
        `,
        {
          parse_mode: "Markdown",
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📈 查看图表",
                  callback_data: `chart_${tokenAddress}`,
                },
                {
                  text: "💰 购买",
                  callback_data: `buy_${tokenAddress}`,
                },
              ],
              [{ text: "❌ 关闭", callback_data: "close" }],
            ],
          },
        }
      );
    } else if (msg.text) {
      const chatId = msg.chat.id;
      bot.sendMessage(
        chatId,
        "请输入有效的TRON代币地址，或使用 /help 查看帮助。"
      );
    }
  });
}

/**
 * 处理回调查询（按钮点击）
 */
function handleCallbackQueries() {
  bot.on("callback_query", (callbackQuery) => {
    const chatId = callbackQuery.message?.chat.id;
    if (!chatId) return;
    const data = callbackQuery.data || "";
    // 处理关闭按钮
    if (data === "close") {
      bot
        .deleteMessage(chatId, callbackQuery.message?.message_id || 0)
        .catch((err) => logger.error(`删除消息失败: ${err.message}`));
      return;
    }
    // 处理返回菜单按钮
    if (data === "back_to_menu") {
      bot.answerCallbackQuery(callbackQuery.id);
      // 模拟发送/start命令的效果
      startCommand(
        {
          chat: { id: chatId },
          from: callbackQuery.from,
        } as TelegramBot.Message,
        bot
      );
      // 如果有消息ID，尝试删除当前消息
      if (callbackQuery.message?.message_id) {
        bot
          .deleteMessage(chatId, callbackQuery.message.message_id)
          .catch((err) => logger.error(`删除消息失败: ${err.message}`));
      }
      return;
    }

    // 处理帮助按钮
    if (data === "help") {
      bot.answerCallbackQuery(callbackQuery.id);
      bot.sendMessage(
        chatId,
        `
🤖 *TRON Sniper Bot 帮助*

以下是可用的命令:
/start - 启动机器人并获取欢迎信息
/help - 显示此帮助信息
/about - 关于本机器人

如何使用:
输入代币地址来获取相关信息和交易选项。
      `,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // 处理关于按钮
    if (data === "about") {
      bot.answerCallbackQuery(callbackQuery.id);
      bot.sendMessage(
        chatId,
        `
*关于 TRON Sniper Bot*

TRON Sniper Bot 是一个专门为 TRON 区块链设计的交易和狙击工具。

✅ 自动监控新代币
✅ 快速交易执行
✅ 实时价格追踪
✅ 安全交易功能

版本: 1.0.0
      `,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // 处理查看图表
    if (data.startsWith("chart_")) {
      const tokenAddress = data.replace("chart_", "");
      bot.answerCallbackQuery(callbackQuery.id, { text: "正在生成图表..." });
      const chartUrl = `https://www.dextools.io/app/cn/tron/pair-explorer/${tokenAddress}?t=${new Date().getTime()}`;
      bot.sendMessage(
        chatId,
        `
*${tokenAddress}* 的价格图表
您可以在DEXTools上查看此代币的实时价格图表:
[点击查看图表](${chartUrl})
        `,
        {
          parse_mode: "Markdown",
          disable_web_page_preview: false,
          reply_markup: {
            inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
          },
        }
      );
      return;
    }

    // 处理购买操作
    if (data.startsWith("buy_")) {
      const tokenAddress = data.replace("buy_", "");
      bot.answerCallbackQuery(callbackQuery.id, { text: "准备购买..." });
      bot.sendMessage(
        chatId,
        `
💰 *购买 ${tokenAddress}*

请选择购买金额:
      `,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "10 TRX", callback_data: `amount_10_${tokenAddress}` },
                { text: "50 TRX", callback_data: `amount_50_${tokenAddress}` },
                {
                  text: "100 TRX",
                  callback_data: `amount_100_${tokenAddress}`,
                },
                {
                  text: "200 TRX",
                  callback_data: `amount_200_${tokenAddress}`,
                },
                {
                  text: "500 TRX",
                  callback_data: `amount_500_${tokenAddress}`,
                },
              ],
              [
                {
                  text: "⌨️ 自定义金额",
                  callback_data: `custom_amount_${tokenAddress}`,
                },
                { text: "❌ 取消", callback_data: "close" },
              ],
            ],
          },
        }
      );
      return;
    }

    // 处理自定义金额输入
    if (data.startsWith("custom_amount_")) {
      const tokenAddress = data.replace("custom_amount_", "");
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "请输入自定义金额...",
      });

      bot
        .sendMessage(
          chatId,
          "请输入您想购买的 TRX 金额（仅数字，例如：150）:",
          {
            reply_markup: {
              force_reply: true,
            },
          }
        )
        .then((sentMessage) => {
          // 设置一个监听器来捕获用户的回复
          bot.onReplyToMessage(
            chatId,
            sentMessage.message_id,
            (replyMessage) => {
              const amount = replyMessage.text;

              // 验证输入是否为有效数字
              if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
                bot.sendMessage(chatId, "❌ 请输入有效的正数金额。", {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "🔄 重试",
                          callback_data: `custom_amount_${tokenAddress}`,
                        },
                      ],
                      [{ text: "❌ 取消", callback_data: "close" }],
                    ],
                  },
                });
                return;
              }

              const numAmount = Number(amount);

              // 发送确认消息
              bot.sendMessage(
                chatId,
                `您确定要使用 ${numAmount} TRX 购买此代币吗？`,
                {
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: "✅ 确认",
                          callback_data: `amount_${numAmount}_${tokenAddress}`,
                        },
                        { text: "❌ 取消", callback_data: "close" },
                      ],
                    ],
                  },
                }
              );
            }
          );
        });

      return;
    }

    // 处理金额选择
    if (data.startsWith("amount_")) {
      const parts = data.split("_");
      if (parts.length >= 3) {
        const amount = parts[1];
        const tokenAddress = parts[2];
        bot.answerCallbackQuery(callbackQuery.id, {
          text: `准备使用 ${amount} TRX 购买...`,
        });

        // 发送交易进行中的消息并保存消息ID以便后续删除
        bot
          .sendMessage(
            chatId,
            `
🔄 *交易进行中*

正在使用 ${amount} TRX 购买代币 \`${tokenAddress}\`

_请稍等，交易正在处理中..._
        `,
            { parse_mode: "Markdown" }
          )
          .then((processingMsg) => {
            // 这里可以添加实际的交易逻辑
            const numAmount = parseFloat(amount);
            const slippage = 10; // 默认滑点10%
            const privateKey = process.env.PRIVATE_KEY;

            // 导入并使用ownerBuyTokenCallback函数
            const { ownerBuyTokenCallback } = require("../callbacks/tokens");

            // 执行购买交易
            ownerBuyTokenCallback(tokenAddress, numAmount, slippage, privateKey)
              .then(
                (result: {
                  success: boolean;
                  txID?: string;
                  error?: string;
                }) => {
                  // 删除"交易进行中"的消息
                  bot
                    .deleteMessage(chatId, processingMsg.message_id)
                    .catch((err) =>
                      logger.error(`删除交易进行中消息失败: ${err.message}`)
                    );

                  if (result.success) {
                    // 交易成功
                    bot.sendMessage(
                      chatId,
                      `
✅ *交易成功*

已成功使用 ${amount} TRX 购买代币
代币地址: \`${tokenAddress}\`
交易哈希: \`${result.txID}\`
查看交易: [Tronscan](https://tronscan.org/#/transaction/${result.txID})

🔘 *后续操作*:
                `,
                      {
                        parse_mode: "Markdown",
                        reply_markup: {
                          inline_keyboard: [
                            [{ text: "❌ 关闭", callback_data: "close" }],
                          ],
                        },
                      }
                    );
                  } else {
                    // 交易失败
                    bot.sendMessage(
                      chatId,
                      `
❌ *交易失败*

购买代币失败
代币地址: \`${tokenAddress}\`
错误信息: \`${result.error}\`

您可以尝试:
- 检查钱包余额是否充足
- 确认代币交易对是否存在
- 调整购买金额或滑点
                  `,
                      {
                        parse_mode: "Markdown",
                        reply_markup: {
                          inline_keyboard: [
                            [
                              {
                                text: "🔄 重试",
                                callback_data: `amount_${amount}_${tokenAddress}`,
                              },
                            ],
                            [{ text: "❌ 关闭", callback_data: "close" }],
                          ],
                        },
                      }
                    );
                  }
                }
              )
              .catch((error: Error) => {
                // 删除"交易进行中"的消息
                bot
                  .deleteMessage(chatId, processingMsg.message_id)
                  .catch((err) =>
                    logger.error(`删除交易进行中消息失败: ${err.message}`)
                  );

                // 处理异常
                bot.sendMessage(
                  chatId,
                  `
❌ *系统错误*

执行交易时发生错误
代币地址: \`${tokenAddress}\`
错误信息: \`${error.message || "未知错误"}\`

请联系管理员处理
                `,
                  {
                    parse_mode: "Markdown",
                    reply_markup: {
                      inline_keyboard: [
                        [{ text: "❌ 关闭", callback_data: "close" }],
                      ],
                    },
                  }
                );
              });
          });
      }
    }

    // 处理设置卖出
    if (data.startsWith("sell_")) {
      const tokenAddress = data.replace("sell_", "");
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "准备设置卖出条件...",
      });
      bot.sendMessage(
        chatId,
        `
📤 *设置卖出条件*

代币: \`${tokenAddress}\`

请选择卖出条件:
      `,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "止盈 +20%",
                  callback_data: `profit_20_${tokenAddress}`,
                },
                {
                  text: "止盈 +50%",
                  callback_data: `profit_50_${tokenAddress}`,
                },
              ],
              [
                { text: "止损 -10%", callback_data: `loss_10_${tokenAddress}` },
                { text: "自定义", callback_data: `custom_${tokenAddress}` },
              ],
              [{ text: "❌ 取消", callback_data: "close" }],
            ],
          },
        }
      );
      return;
    }
  });
}

/**
 * 启动机器人
 */
async function setupBot(): Promise<void> {
  try {
    logger.info("正在启动 Telegram 机器人...");
    // 设置命令列表
    await bot.setMyCommands(commands);
    // 注册命令处理程序
    registerCommandHandlers();
    // 处理文本消息
    handleTextMessages();
    // 处理回调查询
    handleCallbackQueries();
    // 启动轮询
    await bot.startPolling();
    logger.info("Telegram 机器人已成功启动");
    return Promise.resolve();
  } catch (error) {
    logger.error(
      `启动 Telegram 机器人失败: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return Promise.reject(error);
  }
}

export { bot, sendNewTokenNotification, setupBot };
