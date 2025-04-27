import TelegramBot from "node-telegram-bot-api";
import { confirmBuyCallback } from "../callbacks/tokens";
import { errorLOG } from "../utils/logs";
import SniperUtils from "../utils/tronWeb";

/* ------------------------------ */
/*           狙击模块            */
/* ------------------------------ */

/**
 * 处理用户设置的代币狙击订单
 * 该函数会遍历所有用户，检查他们的狙击设置，当条件满足时执行购买操作
 *
 * @param bot Telegram机器人实例，用于向用户发送消息
 * @param usersCollection 用户数据集合，存储在MongoDB中
 */
export async function processSnipes(bot: TelegramBot, usersCollection: any) {
  try {
    // 获取所有用户数据
    const users = await usersCollection.find().toArray();

    // 遍历每个用户
    for (const user of users) {
      const { id: chatId, snipes } = user;

      // 如果用户没有设置狙击订单，则跳过
      if (!snipes || snipes.length === 0) continue;

      // 处理用户的每个狙击订单
      for (const snipe of snipes) {
        const {
          address: tokenAddress, // 要狙击的代币地址
          amountToInvestInTRX, // 投资金额(TRX)
          privateKey, // 用于执行交易的钱包私钥
          slippage, // 允许的滑点百分比
        } = snipe;

        // 在用户的钱包列表中查找对应私钥的钱包索引
        const walletIndex = user.wallets.findIndex(
          (wallet: Wallet) => wallet.privateKey === privateKey
        );

        // 如果找不到对应的钱包，记录错误并跳过当前狙击订单
        if (walletIndex === -1) {
          console.log(`找不到使用私钥 ${privateKey} 的钱包，用户ID: ${chatId}`);
          continue;
        }

        // 检查目标代币是否已在DEX创建交易对
        const pairAddress = await SniperUtils.getPairAddress(tokenAddress);

        // 如果交易对尚未创建，继续等待并跳过当前处理
        if (!pairAddress) {
          console.log(`${chatId}: 仍在等待代币 ${tokenAddress} 的交易对创建`);
          continue;
        }

        // 向用户发送购买开始的通知
        bot.sendMessage(
          chatId,
          `正在购买价值 ${amountToInvestInTRX} TRX的 ${tokenAddress} 代币，滑点设置为 ${slippage}%...`
        );

        // 执行购买操作
        await confirmBuyCallback(
          user,
          bot,
          chatId,
          walletIndex,
          amountToInvestInTRX,
          tokenAddress,
          slippage
        );
      }
    }
  } catch (error) {
    // 捕获并记录处理过程中的任何错误
    console.error(`${errorLOG} ${error}`);
  }
}
