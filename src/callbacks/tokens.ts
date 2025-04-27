import BigNumber from "bignumber.js";
import TelegramBot from "node-telegram-bot-api";
import { TRC20_ABI, WTRX_DECIMALS } from "../config";
import { formatElapsedTime, formatNumber } from "../utils/format";
import { errorLOG } from "../utils/logs";
import SniperUtils from "../utils/tronWeb";

/* ------------------------------ */
/*            BUY PART            */
/* ------------------------------ */

export async function tokenSentCallback(
  bot: TelegramBot,
  chatId: number,
  tokenAddress: string
) {
  try {
    const tokenContract = await SniperUtils.getContractInstance(
      TRC20_ABI,
      tokenAddress
    );

    if (!tokenContract) {
      bot.sendMessage(chatId, "Invalid token address.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const testContract = await tokenContract.name().call();

    if (!testContract) {
      bot.sendMessage(chatId, "Invalid token address.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const pairAddress = await SniperUtils.getPairAddress(tokenAddress);

    if (!pairAddress) {
      bot.sendMessage(chatId, `Would you like to snipe ${testContract}?`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔥 Snipe",
                callback_data: `snipe_${tokenAddress}`,
              },
            ],
            [
              {
                text: "❌ Close",
                callback_data: "close",
              },
            ],
          ],
        },
      });
      return;
    }

    const tokenInformations = await SniperUtils.getTokenInformations(
      pairAddress
    );

    if (!tokenInformations) {
      bot.sendMessage(chatId, "Invalid token address.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const slippagePercentage = 10;

    bot.sendMessage(
      chatId,
      `💎 *${tokenInformations.name}* (${
        tokenInformations.symbol
      }) | ⏰ ${formatElapsedTime(new Date(tokenInformations.pairCreatedAt))}

💰 *Market Cap*: $${formatNumber(tokenInformations.marketCapInUSD)}
💧 *Liquidity*: $${formatNumber(tokenInformations.liquidityInUSD)}
📊 *24h Volume*: $${formatNumber(tokenInformations.volumeInUSD)}

💵 *Price*: $${tokenInformations.tokenPriceInUSD.toLocaleString()}

⚖️ *Slippage*: ${slippagePercentage}%`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔹 Buy 100 TRX",
                callback_data: `enter_10_${tokenAddress}_${slippagePercentage}`,
              },
              {
                text: "🔹 Buy 1,000 TRX",
                callback_data: `enter_100_${tokenAddress}_${slippagePercentage}`,
              },
            ],
            [
              {
                text: "🔹 Buy 10,000 TRX",
                callback_data: `enter_1000_${tokenAddress}_${slippagePercentage}`,
              },
              {
                text: "🔸 Buy custom amount",
                callback_data: `enter_custom_${tokenAddress}_${slippagePercentage}`,
              },
            ],
            [
              {
                text: "🔄 Refresh",
                callback_data: `refreshbuy_${tokenAddress}_${slippagePercentage}`,
              },
            ],
            [
              {
                text: "⚙️ Change slippage",
                callback_data: `change_slippage_${tokenAddress}`,
              },
            ],
          ],
        },
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "Invalid token address.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

export async function enterAmountCallback(
  bot: TelegramBot,
  chatId: number,
  tokenAddress: string,
  slippage: number
) {
  try {
    const text = `Enter the amount of TRX you want to spend on this token.`;

    bot
      .sendMessage(chatId, text, {
        reply_markup: {
          force_reply: true,
        },
      })
      .then((msg) => {
        bot.onReplyToMessage(chatId, msg.message_id, (reply) => {
          const amount = reply.text;

          if (!amount) {
            bot.sendMessage(chatId, "Invalid amount.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          const parsedNumber = parseInt(amount);

          if (isNaN(parsedNumber)) {
            bot.sendMessage(chatId, "Invalid amount.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          if (parsedNumber <= 0) {
            bot.sendMessage(chatId, "Amount must be greater than 0.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          bot.sendMessage(
            chatId,
            `You will spend ${parsedNumber} TRX on this token. Confirm?`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✅ Confirm",
                      callback_data: `enter_${parsedNumber}_${tokenAddress}_${slippage}`,
                    },
                    {
                      text: "❌ Cancel",
                      callback_data: `close`,
                    },
                  ],
                ],
              },
            }
          );
        });
      });
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "An error occurred while entering the amount.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

export async function changeSlippageCallback(
  bot: TelegramBot,
  chatId: number,
  tokenAddress: string,
  message: TelegramBot.Message
) {
  try {
    const text = `Enter the slippage percentage you want to use.`;

    bot
      .sendMessage(chatId, text, {
        reply_markup: {
          force_reply: true,
        },
      })
      .then((msg) => {
        bot.onReplyToMessage(chatId, msg.message_id, async (reply) => {
          const slippageText = reply.text;

          if (!slippageText) {
            bot.sendMessage(chatId, "Invalid slippage.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          const slippage = parseInt(slippageText);

          if (isNaN(slippage)) {
            bot.sendMessage(chatId, "Invalid slippage.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          if (slippage < 0 || slippage > 100) {
            bot.sendMessage(chatId, "Slippage must be between 0 and 100.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          const pairAddress = await SniperUtils.getPairAddress(tokenAddress);

          if (!pairAddress) {
            bot.sendMessage(chatId, "No pair found for this token.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          const tokenInformations = await SniperUtils.getTokenInformations(
            pairAddress
          );

          if (!tokenInformations) {
            bot.sendMessage(chatId, "Token informations not found.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          bot.editMessageText(
            `💎 *${tokenInformations.name}* (${
              tokenInformations.symbol
            }) | ⏰ ${formatElapsedTime(
              new Date(tokenInformations.pairCreatedAt)
            )}

💰 *Market Cap*: $${formatNumber(tokenInformations.marketCapInUSD)}
💧 *Liquidity*: $${formatNumber(tokenInformations.liquidityInUSD)}
📊 *24h Volume*: $${formatNumber(tokenInformations.volumeInUSD)}

💵 *Price*: $${tokenInformations.tokenPriceInUSD.toLocaleString()}

⚖️ *Slippage*: ${slippage}%`,
            {
              chat_id: chatId,
              message_id: message.message_id,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🔹 Buy 100 TRX",
                      callback_data: `enter_10_${tokenAddress}_${slippage}`,
                    },
                    {
                      text: "🔹 Buy 1,000 TRX",
                      callback_data: `enter_100_${tokenAddress}_${slippage}`,
                    },
                  ],
                  [
                    {
                      text: "🔹 Buy 10,000 TRX",
                      callback_data: `enter_1000_${tokenAddress}_${slippage}`,
                    },
                    {
                      text: "🔸 Buy custom amount",
                      callback_data: `enter_custom_${tokenAddress}_${slippage}`,
                    },
                  ],
                  [
                    {
                      text: "🔄 Refresh",
                      callback_data: `refreshbuy_${tokenAddress}_${slippage}`,
                    },
                  ],
                  [
                    {
                      text: "⚙️ Change slippage",
                      callback_data: `change_slippage_${tokenAddress}`,
                    },
                  ],
                ],
              },
              parse_mode: "Markdown",
            }
          );

          bot.sendMessage(
            chatId,
            "Slippage changed successfully to " + slippage + "%",
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            }
          );
        });
      });
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "An error occurred while changing the slippage.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

export async function refreshCallback(
  bot: TelegramBot,
  chatId: number,
  tokenAddress: string,
  slippage: number,
  message: TelegramBot.Message
) {
  try {
    const pairAddress = await SniperUtils.getPairAddress(tokenAddress);

    if (!pairAddress) {
      bot.sendMessage(chatId, "No pair found for this token.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const tokenInformations = await SniperUtils.getTokenInformations(
      pairAddress
    );

    if (!tokenInformations) {
      bot.sendMessage(chatId, "Token informations not found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    bot.editMessageText(
      `💎 *${tokenInformations.name}* (${
        tokenInformations.symbol
      }) | ⏰ ${formatElapsedTime(new Date(tokenInformations.pairCreatedAt))}

💰 *Market Cap*: $${formatNumber(tokenInformations.marketCapInUSD)}
💧 *Liquidity*: $${formatNumber(tokenInformations.liquidityInUSD)}
📊 *24h Volume*: $${formatNumber(tokenInformations.volumeInUSD)}

💵 *Price*: $${tokenInformations.tokenPriceInUSD.toLocaleString()}

⚖️ *Slippage*: ${slippage}%`,
      {
        chat_id: chatId,
        message_id: message.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔹 Buy 100 TRX",
                callback_data: `enter_10_${tokenAddress}_${slippage}`,
              },
              {
                text: "🔹 Buy 1,000 TRX",
                callback_data: `enter_100_${tokenAddress}_${slippage}`,
              },
            ],
            [
              {
                text: "🔹 Buy 10,000 TRX",
                callback_data: `enter_1000_${tokenAddress}_${slippage}`,
              },
              {
                text: "🔸 Buy custom amount",
                callback_data: `enter_custom_${tokenAddress}_${slippage}`,
              },
            ],
            [
              {
                text: "🔄 Refresh",
                callback_data: `refreshbuy_${tokenAddress}_${slippage}`,
              },
            ],
            [
              {
                text: "⚙️ Change slippage",
                callback_data: `change_slippage_${tokenAddress}`,
              },
            ],
          ],
        },
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "An error occurred while refreshing the token.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

export async function buyTokenCallback(
  user: User,
  bot: TelegramBot,
  chatId: number,
  amount: number,
  tokenAddress: string,
  slippage: number
) {
  try {
    const wallets = user.wallets;

    if (wallets.length === 0) {
      bot.sendMessage(chatId, "You have no wallets added.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const balances = await Promise.all(
      wallets.map(async (wallet) => {
        const balance = await SniperUtils.getBalance(wallet.address);

        const balanceTRX = new BigNumber(balance).div(
          new BigNumber(10).pow(WTRX_DECIMALS)
        );

        return `💰 *${balanceTRX.toFixed(2)} TRX* in \`${wallet.address}\`\n`;
      })
    );

    const text = `Select a wallet to use:
    
${balances.join("\n")}`;

    bot
      .sendMessage(chatId, text, {
        reply_markup: {
          inline_keyboard: wallets.map((wallet, index) => [
            {
              text: wallet.address,
              callback_data: `buy_${index}_${amount}_${tokenAddress}_${slippage}`,
            },
          ]),
        },
        parse_mode: "Markdown",
      })
      .then((msg) => {
        setTimeout(() => {
          bot.deleteMessage(chatId, msg.message_id);
        }, 60000);
      });
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "An error occurred while buying the token.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

export async function confirmBuyCallback(
  user: User,
  bot: TelegramBot,
  chatId: number,
  walletIndex: number,
  amount: number,
  tokenAddress: string,
  slippage: number
) {
  try {
    const wallet = user.wallets[walletIndex];

    if (!wallet) {
      bot.sendMessage(chatId, "Invalid wallet.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const balance = await SniperUtils.getBalance(wallet.address);

    const balanceTRX = new BigNumber(balance)
      .div(new BigNumber(10).pow(WTRX_DECIMALS))
      .toNumber();

    if (balanceTRX < amount) {
      bot.sendMessage(chatId, "Insufficient balance.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    } else if (balanceTRX < amount + 75) {
      bot.sendMessage(
        chatId,
        "Insufficient balance to pay for fees. (Balance < Amount + ~75 TRX)",
        {
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
          },
        }
      );
      return;
    }

    const pairAddress = await SniperUtils.getPairAddress(tokenAddress);

    if (!pairAddress) {
      bot.sendMessage(chatId, "No pair found for this token.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const txID = await SniperUtils.buyToken(
      tokenAddress,
      pairAddress,
      amount,
      slippage,
      wallet.address,
      wallet.privateKey
    );

    if (!txID) {
      bot.sendMessage(chatId, "No TXID found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    bot.sendMessage(
      chatId,
      `Transaction sent: [View on Tronscan](https://tronscan.org/#/transaction/${txID})`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      }
    );
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "An error occurred while confirming the buy.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

export async function snipeTokenCallback(
  user: User,
  bot: TelegramBot,
  chatId: number,
  tokenAddress: string
) {
  try {
    const wallets = user.wallets;

    if (wallets.length === 0) {
      bot.sendMessage(chatId, "You have no wallets added.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const balances = await Promise.all(
      wallets.map(async (wallet) => {
        const balance = await SniperUtils.getBalance(wallet.address);

        const balanceTRX = new BigNumber(balance).div(
          new BigNumber(10).pow(WTRX_DECIMALS)
        );

        return `💰 *${balanceTRX.toFixed(2)} TRX* in \`${wallet.address}\`\n`;
      })
    );

    const text = `Select a wallet to use:

${balances.join("\n")}`;

    bot
      .sendMessage(chatId, text, {
        reply_markup: {
          inline_keyboard: wallets.map((wallet, index) => [
            {
              text: wallet.address,
              callback_data: `snipenow_${index}_${tokenAddress}`,
            },
          ]),
        },
        parse_mode: "Markdown",
      })
      .then((msg) => {
        setTimeout(() => {
          bot.deleteMessage(chatId, msg.message_id);
        }, 60000);
      });
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "An error occurred while sniping the token.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

export async function snipeNowCallback(
  usersCollection: any,
  user: User,
  bot: TelegramBot,
  chatId: number,
  walletIndex: number,
  tokenAddress: string
) {
  try {
    const wallet = user.wallets[walletIndex];

    if (!wallet) {
      bot.sendMessage(chatId, "Invalid wallet.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const text = `Enter the slippage percentage you want to use.`;

    bot
      .sendMessage(chatId, text, {
        reply_markup: {
          force_reply: true,
        },
      })
      .then((msg) => {
        bot.onReplyToMessage(chatId, msg.message_id, async (reply) => {
          const slippageText = reply.text;

          if (!slippageText) {
            bot.sendMessage(chatId, "Invalid slippage.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          const slippage = parseInt(slippageText);

          if (isNaN(slippage)) {
            bot.sendMessage(chatId, "Invalid slippage.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          if (slippage < 0 || slippage > 100) {
            bot.sendMessage(chatId, "Slippage must be between 0 and 100.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          const text = `Enter the amount of TRX you want to spend on this token.`;

          bot
            .sendMessage(chatId, text, {
              reply_markup: {
                force_reply: true,
              },
            })
            .then((msg) => {
              bot.onReplyToMessage(chatId, msg.message_id, async (reply) => {
                const amount = reply.text;

                if (!amount) {
                  bot.sendMessage(chatId, "Invalid amount.", {
                    reply_markup: {
                      inline_keyboard: [
                        [{ text: "❌ Close", callback_data: "close" }],
                      ],
                    },
                  });
                  return;
                }

                const parsedNumber = parseInt(amount);

                if (isNaN(parsedNumber)) {
                  bot.sendMessage(chatId, "Invalid amount.", {
                    reply_markup: {
                      inline_keyboard: [
                        [{ text: "❌ Close", callback_data: "close" }],
                      ],
                    },
                  });
                  return;
                }

                if (parsedNumber <= 0) {
                  bot.sendMessage(chatId, "Amount must be greater than 0.", {
                    reply_markup: {
                      inline_keyboard: [
                        [{ text: "❌ Close", callback_data: "close" }],
                      ],
                    },
                  });
                  return;
                }

                const balance = await SniperUtils.getBalance(wallet.address);

                const balanceTRX = new BigNumber(balance)
                  .div(new BigNumber(10).pow(WTRX_DECIMALS))
                  .toNumber();

                if (balanceTRX < parsedNumber) {
                  bot.sendMessage(chatId, "Insufficient balance.", {
                    reply_markup: {
                      inline_keyboard: [
                        [{ text: "❌ Close", callback_data: "close" }],
                      ],
                    },
                  });
                  return;
                } else if (balanceTRX < parsedNumber + 75) {
                  bot.sendMessage(
                    chatId,
                    "Insufficient balance to pay for fees. (Balance < Amount + ~75 TRX)",
                    {
                      reply_markup: {
                        inline_keyboard: [
                          [{ text: "❌ Close", callback_data: "close" }],
                        ],
                      },
                    }
                  );
                  return;
                }

                const dataToInsert = {
                  address: tokenAddress,
                  amountToInvestInTRX: parsedNumber,
                  privateKey: wallet.privateKey,
                  slippage: slippage,
                } as Snipe;

                await usersCollection.updateOne(
                  { id: chatId },
                  {
                    $push: {
                      snipes: dataToInsert,
                    },
                  }
                );

                bot.sendMessage(
                  chatId,
                  `Snipe added successfully. You will snipe ${parsedNumber} TRX on this token with ${slippage}% slippage.`,
                  {
                    parse_mode: "Markdown",
                    reply_markup: {
                      inline_keyboard: [
                        [
                          {
                            text: "❌ Cancel Snipe",
                            callback_data: `cancel_snipe_${tokenAddress}`,
                          },
                        ],
                        [{ text: "❌ Close", callback_data: "close" }],
                      ],
                    },
                  }
                );
              });
            });
        });
      });
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "An error occurred while sniping the token.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

export async function cancelSnipeCallback(
  usersCollection: any,
  bot: TelegramBot,
  chatId: number,
  tokenAddress: string
) {
  try {
    const dataToDelete = {
      address: tokenAddress,
    } as Snipe;

    await usersCollection.updateOne(
      { id: chatId },
      {
        $pull: {
          snipes: dataToDelete,
        },
      }
    );

    bot.sendMessage(chatId, "Snipe canceled successfully.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "An error occurred while canceling the snipe.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

export async function mySnipesCallback(
  user: User,
  bot: TelegramBot,
  chatId: number
) {
  try {
    const snipes = user.snipes;

    if (snipes.length === 0) {
      bot.sendMessage(chatId, "You have no pending snipes.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    for (const snipe of snipes) {
      const tokenContract = await SniperUtils.getContractInstance(
        TRC20_ABI,
        snipe.address
      );

      if (!tokenContract) continue;

      const name = await tokenContract.name().call();
      const symbol = await tokenContract.symbol().call();

      bot.sendMessage(
        chatId,
        `🎯 *${name}* (${symbol}) | 💰 ${snipe.amountToInvestInTRX} TRX | ⚖️ ${snipe.slippage}%`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "❌ Cancel",
                  callback_data: `cancel_snipe_${snipe.address}`,
                },
              ],
            ],
          },
          parse_mode: "Markdown",
        }
      );
    }
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "An error occurred while fetching your snipes.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

/**
 * 使用私钥进行代币购买，自动从私钥获取钱包地址
 * @param tokenAddress 要购买的代币地址
 * @param amount 要消费的TRX数量
 * @param slippage 允许的滑点百分比
 * @param privateKey 钱包私钥
 * @returns 成功返回交易ID，失败返回错误信息
 */
export async function ownerBuyTokenCallback(
  tokenAddress: string,
  amount: number,
  slippage: number,
  privateKey: string
): Promise<{ success: boolean; txID?: string; error?: string }> {
  try {
    // 检查参数有效性
    if (!tokenAddress || !amount || !slippage || !privateKey) {
      return {
        success: false,
        error: "参数不完整，请提供所有必需的参数",
      };
    }
    // 从私钥获取钱包地址
    const walletAddress = SniperUtils.importAccount(privateKey);
    if (!walletAddress) {
      return {
        success: false,
        error: "无法从私钥获取钱包地址，请检查私钥是否有效",
      };
    }
    // 获取钱包TRX余额
    const balance = await SniperUtils.getBalance(walletAddress);
    if (!balance) {
      return {
        success: false,
        error: "无法获取钱包余额",
      };
    }

    // 转换为可读格式
    const balanceTRX = new BigNumber(balance)
      .div(new BigNumber(10).pow(WTRX_DECIMALS))
      .toNumber();
    // 检查余额是否足够
    if (balanceTRX < amount) {
      return {
        success: false,
        error:
          "余额不足，当前余额: " +
          balanceTRX +
          " TRX，需要: " +
          amount +
          " TRX",
      };
    }
    // 获取交易对地址
    const pairAddress = await SniperUtils.getPairAddress(tokenAddress);
    if (!pairAddress) {
      return {
        success: false,
        error: "找不到该代币的交易对，可能尚未在DEX上创建流动性",
      };
    }
    // 执行购买交易
    const txID = await SniperUtils.buyToken(
      tokenAddress,
      pairAddress,
      amount,
      slippage,
      walletAddress,
      privateKey
    );

    if (!txID) {
      return {
        success: false,
        error: "交易失败，可能是网络问题或交易被拒绝",
      };
    }

    // 交易成功，返回交易ID
    return {
      success: true,
      txID,
    };
  } catch (error) {
    // 捕获并处理所有可能的错误
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${errorLOG} ${error}`);
    return {
      success: false,
      error: `购买代币时发生错误: ${errorMessage}`,
    };
  }
}

/* ------------------------------ */
/*            SELL PART           */
/* ------------------------------ */

export async function myPositionsCallback(
  user: User,
  bot: TelegramBot,
  chatId: number
) {
  try {
    const wallets = user.wallets;

    if (wallets.length === 0) {
      bot.sendMessage(chatId, "You have no wallets added.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    let positionsFound = false;
    for (const walletIndex in wallets) {
      const wallet = wallets[walletIndex];
      const positions = (await SniperUtils.getTokensBalance(
        wallet.address
      )) as Token[];

      if (positions.length === 0) continue;

      for (const position of positions) {
        const positionContract = await SniperUtils.getContractInstance(
          TRC20_ABI,
          position.address
        );

        if (!positionContract) continue;

        const decimals = await positionContract.decimals().call();

        if (!decimals) continue;

        const balance = new BigNumber(position.balance)
          .div(new BigNumber(10).pow(decimals))
          .toNumber()
          .toFixed(3);

        if (Number(balance) === 0) continue;

        const pairAddress = await SniperUtils.getPairAddress(position.address);

        if (!pairAddress) {
          bot.sendMessage(
            chatId,
            `Pair not found for ${position.name} (${position.symbol}).`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            }
          );
          continue;
        }

        const tokenInformations = await SniperUtils.getTokenInformations(
          pairAddress
        );

        if (!tokenInformations) {
          bot.sendMessage(
            chatId,
            `Unable to retrieve information for ${position.name} (${position.symbol}).`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            }
          );
          continue;
        }

        const slippagePercentage = 10;

        bot.sendMessage(
          chatId,
          `💎 *${tokenInformations.name}* (${
            tokenInformations.symbol
          }) | ⏰ ${formatElapsedTime(
            new Date(tokenInformations.pairCreatedAt)
          )}

💰 *Market Cap*: $${formatNumber(tokenInformations.marketCapInUSD)}
💧 *Liquidity*: $${formatNumber(tokenInformations.liquidityInUSD)}
📊 *24h Volume*: $${formatNumber(tokenInformations.volumeInUSD)}

💵 *Price*: $${tokenInformations.tokenPriceInUSD.toLocaleString()}
🎒 *Your Balance*: ${balance} ${position.symbol}

⚖️ *Slippage*: ${slippagePercentage}%`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🔻 Sell 100%",
                    callback_data: `sell_100_${walletIndex}_${position.address}_${slippagePercentage}`,
                  },
                  {
                    text: "🔻 Sell 50%",
                    callback_data: `sell_50_${walletIndex}_${position.address}_${slippagePercentage}`,
                  },
                ],
                [
                  {
                    text: "🔻 Sell Custom %",
                    callback_data: `sellcustom_${walletIndex}_${position.address}_${slippagePercentage}`,
                  },
                ],
                [
                  {
                    text: "🔄 Refresh",
                    callback_data: `refreshsell_${walletIndex}_${position.address}_${slippagePercentage}`,
                  },
                ],
                [
                  {
                    text: "⚙️ Change slippage",
                    callback_data: `change_slippagesell_${walletIndex}_${position.address}`,
                  },
                ],
              ],
            },
            parse_mode: "Markdown",
          }
        );

        positionsFound = true;
      }
    }

    if (!positionsFound) {
      bot.sendMessage(chatId, "No positions found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
    }
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(
      chatId,
      "An error occurred while fetching your positions.",
      {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      }
    );
  }
}

export async function refreshSellCallback(
  user: User,
  bot: TelegramBot,
  chatId: number,
  walletIndex: number,
  tokenAddress: string,
  slippage: number,
  message: TelegramBot.Message
) {
  try {
    const wallets = user.wallets;
    const wallet = wallets[walletIndex];

    const positions = (await SniperUtils.getTokensBalance(
      wallet.address
    )) as Token[];

    if (positions.length === 0) {
      bot.sendMessage(chatId, "No positions found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const position = positions.find(
      (position) => position.address === tokenAddress
    );

    if (!position) {
      bot.sendMessage(chatId, "Position not found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const positionContract = await SniperUtils.getContractInstance(
      TRC20_ABI,
      position.address
    );

    if (!positionContract) {
      bot.sendMessage(chatId, "No contract found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const decimals = await positionContract.decimals().call();

    if (!decimals) {
      bot.sendMessage(chatId, "No decimals found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const balance = new BigNumber(position.balance)
      .div(new BigNumber(10).pow(decimals))
      .toNumber()
      .toFixed(3);

    const pairAddress = await SniperUtils.getPairAddress(position.address);

    if (!pairAddress) {
      bot.sendMessage(chatId, "No pair found for this token.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const tokenInformations = await SniperUtils.getTokenInformations(
      pairAddress
    );

    if (!tokenInformations) {
      bot.sendMessage(chatId, "No token informations found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    bot.editMessageText(
      `💎 *${tokenInformations.name}* (${
        tokenInformations.symbol
      }) | ⏰ ${formatElapsedTime(new Date(tokenInformations.pairCreatedAt))}

💰 *Market Cap*: $${formatNumber(tokenInformations.marketCapInUSD)}
💧 *Liquidity*: $${formatNumber(tokenInformations.liquidityInUSD)}
📊 *24h Volume*: $${formatNumber(tokenInformations.volumeInUSD)}

💵 *Price*: $${tokenInformations.tokenPriceInUSD.toLocaleString()}
🎒 *Your Balance*: ${balance} ${position.symbol}

⚖️ *Slippage*: ${slippage}%`,
      {
        chat_id: chatId,
        message_id: message.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔻 Sell 100%",
                callback_data: `sell_100_${walletIndex}_${tokenAddress}_${slippage}`,
              },
              {
                text: "🔻 Sell 50%",
                callback_data: `sell_50_${walletIndex}_${tokenAddress}_${slippage}`,
              },
            ],
            [
              {
                text: "🔻 Sell Custom %",
                callback_data: `sellcustom_${walletIndex}_${tokenAddress}_${slippage}`,
              },
            ],
            [
              {
                text: "🔄 Refresh",
                callback_data: `refreshsell_${walletIndex}_${tokenAddress}_${slippage}`,
              },
            ],
            [
              {
                text: "⚙️ Change slippage",
                callback_data: `change_slippagesell_${walletIndex}_${tokenAddress}`,
              },
            ],
          ],
        },
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "An error occurred while refreshing the token.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

export async function changeSlippageSellCallback(
  user: User,
  bot: TelegramBot,
  chatId: number,
  walletIndex: number,
  tokenAddress: string,
  message: TelegramBot.Message
) {
  try {
    const wallets = user.wallets;
    const wallet = wallets[walletIndex];

    const positions = (await SniperUtils.getTokensBalance(
      wallet.address
    )) as Token[];

    if (positions.length === 0) {
      bot.sendMessage(chatId, "No positions found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const position = positions.find(
      (position) => position.address === tokenAddress
    );

    if (!position) {
      bot.sendMessage(chatId, "Position not found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const positionContract = await SniperUtils.getContractInstance(
      TRC20_ABI,
      position.address
    );

    if (!positionContract) {
      bot.sendMessage(chatId, "No contract found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const decimals = await positionContract.decimals().call();

    if (!decimals) {
      bot.sendMessage(chatId, "No decimals found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const balance = new BigNumber(position.balance)
      .div(new BigNumber(10).pow(decimals))
      .toNumber()
      .toFixed(3);

    const pairAddress = await SniperUtils.getPairAddress(position.address);

    if (!pairAddress) {
      bot.sendMessage(chatId, "No pair found for this token.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const tokenInformations = await SniperUtils.getTokenInformations(
      pairAddress
    );

    if (!tokenInformations) {
      bot.sendMessage(chatId, "No token informations found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const text = `Enter the slippage percentage you want to use.`;

    bot
      .sendMessage(chatId, text, {
        reply_markup: {
          force_reply: true,
        },
      })
      .then((msg) => {
        bot.onReplyToMessage(chatId, msg.message_id, async (reply) => {
          const slippageText = reply.text;

          if (!slippageText) {
            bot.sendMessage(chatId, "Invalid slippage.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          const slippage = parseInt(slippageText);

          if (isNaN(slippage)) {
            bot.sendMessage(chatId, "Invalid slippage.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          if (slippage < 0 || slippage > 100) {
            bot.sendMessage(chatId, "Slippage must be between 0 and 100.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          bot.editMessageText(
            `💎 *${tokenInformations.name}* (${
              tokenInformations.symbol
            }) | ⏰ ${formatElapsedTime(
              new Date(tokenInformations.pairCreatedAt)
            )}

💰 *Market Cap*: $${formatNumber(tokenInformations.marketCapInUSD)}
💧 *Liquidity*: $${formatNumber(tokenInformations.liquidityInUSD)}
📊 *24h Volume*: $${formatNumber(tokenInformations.volumeInUSD)}

💵 *Price*: $${tokenInformations.tokenPriceInUSD.toLocaleString()}
🎒 *Your Balance*: ${balance} ${position.symbol}

⚖️ *Slippage*: ${slippage}%`,
            {
              chat_id: chatId,
              message_id: message.message_id,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🔻 Sell 100%",
                      callback_data: `sell_100_${walletIndex}_${tokenAddress}_${slippage}`,
                    },
                    {
                      text: "🔻 Sell 50%",
                      callback_data: `sell_50_${walletIndex}_${tokenAddress}_${slippage}`,
                    },
                  ],
                  [
                    {
                      text: "🔻 Sell Custom %",
                      callback_data: `sellcustom_${walletIndex}_${tokenAddress}_${slippage}`,
                    },
                  ],
                  [
                    {
                      text: "🔄 Refresh",
                      callback_data: `refreshsell_${walletIndex}_${tokenAddress}_${slippage}`,
                    },
                  ],
                  [
                    {
                      text: "⚙️ Change slippage",
                      callback_data: `change_slippagesell_${walletIndex}_${tokenAddress}`,
                    },
                  ],
                ],
              },
              parse_mode: "Markdown",
            }
          );

          bot.sendMessage(
            chatId,
            "Slippage changed successfully to " + slippage + "%",
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            }
          );
        });
      });
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "An error occurred while changing the slippage.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

export async function sellTokenCallback(
  user: User,
  bot: TelegramBot,
  chatId: number,
  walletIndex: number,
  percentageToSell: number,
  tokenAddress: string,
  slippage: number
) {
  try {
    const wallet = user.wallets[walletIndex];

    if (!wallet) {
      bot.sendMessage(chatId, "Invalid wallet.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const positions = (await SniperUtils.getTokensBalance(
      wallet.address
    )) as Token[];

    if (positions.length === 0) {
      bot.sendMessage(chatId, "No positions found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const position = positions.find(
      (position) => position.address === tokenAddress
    );

    if (!position) {
      bot.sendMessage(chatId, "Position not found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const positionContract = await SniperUtils.getContractInstance(
      TRC20_ABI,
      position.address
    );

    if (!positionContract) {
      bot.sendMessage(chatId, "No contract found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const decimals = await positionContract.decimals().call();

    if (!decimals) {
      bot.sendMessage(chatId, "No decimals found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const balance = new BigNumber(position.balance)
      .div(new BigNumber(10).pow(decimals))
      .toNumber();

    const amount = (balance * percentageToSell) / 100;

    if (balance < amount) {
      bot.sendMessage(chatId, "Insufficient balance.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const balanceTRX = await SniperUtils.getBalance(wallet.address);
    const balanceTRXNumber = new BigNumber(balanceTRX)
      .div(new BigNumber(10).pow(WTRX_DECIMALS))
      .toNumber();

    if (balanceTRXNumber < 75) {
      bot.sendMessage(
        chatId,
        "Insufficient balance to pay for fees. (Balance < ~75 TRX)",
        {
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
          },
        }
      );
      return;
    }

    const pairAddress = await SniperUtils.getPairAddress(tokenAddress);

    if (!pairAddress) {
      bot.sendMessage(chatId, "No pair found for this token.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const sellingMessage = await bot.sendMessage(chatId, `Selling...`);

    const txID = await SniperUtils.sellToken(
      tokenAddress,
      pairAddress,
      amount,
      slippage,
      wallet.address,
      wallet.privateKey
    );

    if (!txID) {
      bot.sendMessage(chatId, "No TXID found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    bot.sendMessage(
      chatId,
      `Transaction sent: [View on Tronscan](https://tronscan.org/#/transaction/${txID})`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      }
    );
    bot.deleteMessage(chatId, sellingMessage.message_id);
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "An error occurred while selling the token.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

export async function sellCustomTokenCallback(
  user: User,
  bot: TelegramBot,
  chatId: number,
  walletIndex: number,
  tokenAddress: string,
  slippage: number
) {
  try {
    const wallet = user.wallets[walletIndex];

    if (!wallet) {
      bot.sendMessage(chatId, "Invalid wallet.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const positions = (await SniperUtils.getTokensBalance(
      wallet.address
    )) as Token[];

    if (positions.length === 0) {
      bot.sendMessage(chatId, "No positions found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const position = positions.find(
      (position) => position.address === tokenAddress
    );

    if (!position) {
      bot.sendMessage(chatId, "Position not found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const positionContract = await SniperUtils.getContractInstance(
      TRC20_ABI,
      position.address
    );

    if (!positionContract) {
      bot.sendMessage(chatId, "No contract found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const decimals = await positionContract.decimals().call();

    if (!decimals) {
      bot.sendMessage(chatId, "No decimals found.", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
        },
      });
      return;
    }

    const balance = new BigNumber(position.balance)
      .div(new BigNumber(10).pow(decimals))
      .toNumber();

    const text = `Enter the percentage of ${position.symbol} you want to sell.`;

    bot
      .sendMessage(chatId, text, {
        reply_markup: {
          force_reply: true,
        },
      })
      .then((msg) => {
        bot.onReplyToMessage(chatId, msg.message_id, (reply) => {
          const amount = reply.text;

          if (!amount) {
            bot.sendMessage(chatId, "Invalid amount.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          const percentageNumber = parseFloat(amount);

          if (isNaN(percentageNumber)) {
            bot.sendMessage(chatId, "Invalid amount.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          if (percentageNumber < 0 || percentageNumber > 100) {
            bot.sendMessage(
              chatId,
              "The percentage must be between 0 and 100.",
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "❌ Close", callback_data: "close" }],
                  ],
                },
              }
            );
            return;
          }

          const parsedNumber = balance * (percentageNumber / 100);

          if (balance < parsedNumber) {
            bot.sendMessage(chatId, "Insufficient balance.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          const pairAddress = SniperUtils.getPairAddress(tokenAddress);

          if (!pairAddress) {
            bot.sendMessage(chatId, "No pair found for this token.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ Close", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          bot.sendMessage(
            chatId,
            `You will sell ${parsedNumber} ${position.symbol}. Confirm?`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✅ Confirm",
                      callback_data: `sell_${percentageNumber}_${walletIndex}_${tokenAddress}_${slippage}`,
                    },
                    {
                      text: "❌ Cancel",
                      callback_data: `close`,
                    },
                  ],
                ],
              },
            }
          );
        });
      });
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "An error occurred while selling the token.", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ Close", callback_data: "close" }]],
      },
    });
  }
}

/**
 * 代币到代币的交换回调
 * 允许用户直接将一种代币交换为另一种代币
 * @param user 用户对象
 * @param bot Telegram 机器人实例
 * @param chatId 聊天ID
 * @param fromTokenAddress 源代币地址
 * @param toTokenAddress 目标代币地址
 * @param slippage 滑点百分比
 */
export async function swapTokensForTokensCallback(
  user: User,
  bot: TelegramBot,
  chatId: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  slippage: number
) {
  try {
    const wallets = user.wallets;

    if (wallets.length === 0) {
      bot.sendMessage(chatId, "您还没有添加钱包。", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
        },
      });
      return;
    }

    // 获取源代币的信息
    const fromTokenContract = await SniperUtils.getContractInstance(
      TRC20_ABI,
      fromTokenAddress
    );

    if (!fromTokenContract) {
      bot.sendMessage(chatId, "源代币地址无效。", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
        },
      });
      return;
    }

    const fromTokenName = await fromTokenContract.name().call();
    const fromTokenSymbol = await fromTokenContract.symbol().call();
    const fromTokenDecimals = await fromTokenContract.decimals().call();

    // 获取目标代币的信息
    const toTokenContract = await SniperUtils.getContractInstance(
      TRC20_ABI,
      toTokenAddress
    );

    if (!toTokenContract) {
      bot.sendMessage(chatId, "目标代币地址无效。", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
        },
      });
      return;
    }

    const toTokenName = await toTokenContract.name().call();
    const toTokenSymbol = await toTokenContract.symbol().call();

    // 获取用户每个钱包的代币余额
    const balances = await Promise.all(
      wallets.map(async (wallet) => {
        const balance = await fromTokenContract
          .balanceOf(wallet.address)
          .call();

        const balanceFormatted = new BigNumber(balance.toString())
          .div(new BigNumber(10).pow(fromTokenDecimals))
          .toFixed(4);

        return `💰 *${balanceFormatted} ${fromTokenSymbol}* in \`${wallet.address}\`\n`;
      })
    );

    const text = `选择要用于交换的钱包:
    
将 *${fromTokenName} (${fromTokenSymbol})* 交换为 *${toTokenName} (${toTokenSymbol})*
滑点设置为: ${slippage}%

${balances.join("\n")}`;

    bot
      .sendMessage(chatId, text, {
        reply_markup: {
          inline_keyboard: wallets.map((wallet, index) => [
            {
              text: wallet.address,
              callback_data: `selectswapwallet_${index}_${fromTokenAddress}_${toTokenAddress}_${slippage}`,
            },
          ]),
        },
        parse_mode: "Markdown",
      })
      .then((msg) => {
        setTimeout(() => {
          bot.deleteMessage(chatId, msg.message_id);
        }, 60000);
      });
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "交换代币时发生错误。", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
      },
    });
  }
}

/**
 * 选择钱包后输入交换金额
 */
export async function selectSwapWalletCallback(
  user: User,
  bot: TelegramBot,
  chatId: number,
  walletIndex: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  slippage: number
) {
  try {
    const wallet = user.wallets[walletIndex];

    if (!wallet) {
      bot.sendMessage(chatId, "钱包无效。", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
        },
      });
      return;
    }

    // 获取源代币信息
    const fromTokenContract = await SniperUtils.getContractInstance(
      TRC20_ABI,
      fromTokenAddress
    );

    if (!fromTokenContract) {
      bot.sendMessage(chatId, "源代币地址无效。", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
        },
      });
      return;
    }

    const fromTokenSymbol = await fromTokenContract.symbol().call();
    const fromTokenDecimals = await fromTokenContract.decimals().call();

    // 获取用户代币余额
    const balance = await fromTokenContract.balanceOf(wallet.address).call();
    const balanceFormatted = new BigNumber(balance.toString())
      .div(new BigNumber(10).pow(fromTokenDecimals))
      .toFixed(4);

    const text = `请输入您想要交换的 ${fromTokenSymbol} 数量：

您当前有 ${balanceFormatted} ${fromTokenSymbol}`;

    bot
      .sendMessage(chatId, text, {
        reply_markup: {
          force_reply: true,
        },
      })
      .then((msg) => {
        bot.onReplyToMessage(chatId, msg.message_id, async (reply) => {
          const amount = reply.text;

          if (!amount) {
            bot.sendMessage(chatId, "金额无效。", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ 关闭", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          const parsedNumber = parseFloat(amount);

          if (isNaN(parsedNumber)) {
            bot.sendMessage(chatId, "金额无效。", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ 关闭", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          if (parsedNumber <= 0) {
            bot.sendMessage(chatId, "金额必须大于0。", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ 关闭", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          // 检查余额是否足够
          const userBalance = new BigNumber(balance.toString())
            .div(new BigNumber(10).pow(fromTokenDecimals))
            .toNumber();

          if (userBalance < parsedNumber) {
            bot.sendMessage(chatId, "余额不足。", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ 关闭", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          // 获取目标代币信息
          const toTokenContract = await SniperUtils.getContractInstance(
            TRC20_ABI,
            toTokenAddress
          );

          if (!toTokenContract) {
            bot.sendMessage(chatId, "目标代币地址无效。", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "❌ 关闭", callback_data: "close" }],
                ],
              },
            });
            return;
          }

          const toTokenName = await toTokenContract.name().call();
          const toTokenSymbol = await toTokenContract.symbol().call();

          bot.sendMessage(
            chatId,
            `您将使用 ${parsedNumber} ${fromTokenSymbol} 交换 ${toTokenName} (${toTokenSymbol})。确认?`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✅ 确认",
                      callback_data: `confirmswap_${walletIndex}_${fromTokenAddress}_${toTokenAddress}_${parsedNumber}_${slippage}`,
                    },
                    {
                      text: "❌ 取消",
                      callback_data: `close`,
                    },
                  ],
                ],
              },
            }
          );
        });
      });
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "选择钱包时发生错误。", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
      },
    });
  }
}

/**
 * 确认交换并执行交易
 */
export async function confirmSwapCallback(
  user: User,
  bot: TelegramBot,
  chatId: number,
  walletIndex: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: number,
  slippage: number
) {
  try {
    const wallet = user.wallets[walletIndex];

    if (!wallet) {
      bot.sendMessage(chatId, "钱包无效。", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
        },
      });
      return;
    }

    // 获取源代币信息
    const fromTokenContract = await SniperUtils.getContractInstance(
      TRC20_ABI,
      fromTokenAddress
    );

    if (!fromTokenContract) {
      bot.sendMessage(chatId, "源代币地址无效。", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
        },
      });
      return;
    }

    const fromTokenSymbol = await fromTokenContract.symbol().call();

    const swappingMessage = await bot.sendMessage(
      chatId,
      `正在交换 ${amount} ${fromTokenSymbol}...`
    );

    // 执行交换
    const txID = await SniperUtils.swapTokensForTokens(
      fromTokenAddress,
      toTokenAddress,
      amount,
      slippage,
      wallet.address,
      wallet.privateKey
    );

    if (!txID) {
      bot.deleteMessage(chatId, swappingMessage.message_id);
      bot.sendMessage(chatId, "交易失败，未找到交易ID。", {
        reply_markup: {
          inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
        },
      });
      return;
    }

    bot.deleteMessage(chatId, swappingMessage.message_id);
    bot.sendMessage(
      chatId,
      `交易已发送: [在 Tronscan 上查看](https://tronscan.org/#/transaction/${txID})`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
        },
      }
    );
  } catch (error) {
    console.error(`${errorLOG} ${error}`);
    bot.sendMessage(chatId, "确认交换时发生错误。", {
      reply_markup: {
        inline_keyboard: [[{ text: "❌ 关闭", callback_data: "close" }]],
      },
    });
  }
}
