import SniperUtils from "../utils/tronWeb";

/**
 * @name 获取代币基本信息
 */
export const getTokenInfo = async (
  txInfo: any
): Promise<{
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  creator: string;
}> => {
  try {
    let tokenAddress = "";
    let creatorAddress = "";

    for (const log of txInfo.log) {
      if (!log.topics || !Array.isArray(log.topics)) {
        continue;
      }

      const tokenCreateEvent =
        log.topics[0] ===
        "1ff0a01c8968e3551472812164f233abb579247de887db8cbb18281c149bee7a";
      if (tokenCreateEvent) {
        tokenAddress =
          log.data && log.data.length >= 64
            ? SniperUtils.getAddressFromHex("41" + log.data.slice(24, 64))
            : SniperUtils.getAddressFromHex("41" + log.address);

        // 获取创建者地址 (如果在日志中有提供)
        creatorAddress = "";
        if (log.topics.length > 1 && log.topics[1]) {
          creatorAddress = SniperUtils.getAddressFromHex(
            "41" + log.topics[1].slice(24)
          );
        }
      }
    }

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
      return {
        name: "未知",
        symbol: "未知",
        decimals: 0,
        address: tokenAddress,
        creator: creatorAddress,
      };
    }

    let name = "未知";
    let symbol = "未知";
    let decimals = 0;

    name = await tokenContract.name().call();
    symbol = await tokenContract.symbol().call();
    decimals = await tokenContract.decimals().call();

    return {
      name,
      symbol,
      decimals,
      address: tokenAddress,
      creator: creatorAddress,
    };
  } catch (error) {
    return {
      name: "未知",
      symbol: "未知",
      decimals: 0,
      address: "",
      creator: "",
    };
  }
};
