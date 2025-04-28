import SniperUtils from "../utils/tronWeb";

/**
 * @name 获取代币基本信息
 */
export const getTokenInfo = async (
  tokenAddress: string
): Promise<{
  name: string;
  symbol: string;
  decimals: number;
}> => {
  try {
    // 获取代币合约实例
    const tokenContract = await SniperUtils.getContractInstance(
      [
        {
          constant: true,
          inputs: [],
          name: "name",
          outputs: [{ name: "", type: "string" }],
          payable: false,
          stateMutability: "view",
          type: "function",
        },
        {
          constant: true,
          inputs: [],
          name: "symbol",
          outputs: [{ name: "", type: "string" }],
          payable: false,
          stateMutability: "view",
          type: "function",
        },
        {
          constant: true,
          inputs: [],
          name: "decimals",
          outputs: [{ name: "", type: "uint8" }],
          payable: false,
          stateMutability: "view",
          type: "function",
        },
      ],
      tokenAddress
    );

    if (!tokenContract) {
      return { name: "未知", symbol: "未知", decimals: 0 };
    }

    let name = "未知";
    let symbol = "未知";
    let decimals = 0;

    name = await tokenContract.name().call();
    symbol = await tokenContract.symbol().call();
    decimals = await tokenContract.decimals().call();

    return { name, symbol, decimals };
  } catch (error) {
    return { name: "未知", symbol: "未知", decimals: 0 };
  }
};
