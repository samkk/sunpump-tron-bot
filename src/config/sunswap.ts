import { SUNPUMP_CONTRACT_ADDRESS, SUNSWAP_ROUTER_ADDRESS } from "../config";
import { Tronweb } from "../utils/tronWeb";
import { SUNPUMP_ABI } from "./abi/sunpump";

/**
 * 获取代币基本信息
 * @param tokenAddress 代币合约地址
 * @returns 返回代币的名称、符号和精度
 */
export async function getTokenInfo(tokenAddress: string) {
  const contract = await Tronweb.contract().at(tokenAddress);
  const name = await contract.name().call();
  const symbol = await contract.symbol().call();
  const decimals = await contract.decimals().call();
  return { name, symbol, decimals };
}

/**
 * 检查用户授权 SunSwap 路由合约的代币额度
 * @param tokenAddress 代币合约地址
 * @param ownerAddress 用户钱包地址
 * @returns 已授权的代币数量（十进制格式）
 */
export async function checkAllowance(
  tokenAddress: string,
  ownerAddress: string
) {
  const contract = await Tronweb.contract().at(tokenAddress);
  const allowance = await contract
    .allowance(ownerAddress, SUNSWAP_ROUTER_ADDRESS)
    .call();
  return Tronweb.toDecimal(allowance);
}

/**
 * 授权 SunSwap 路由合约使用用户的代币
 * @param tokenAddress 代币合约地址
 * @param amount 授权金额
 * @returns 交易结果
 */
export async function approveToken(tokenAddress: string, amount: string) {
  const contract = await Tronweb.contract().at(tokenAddress);
  const transaction = await contract
    .approve(SUNSWAP_ROUTER_ADDRESS, amount)
    .send();
  return transaction;
}

/**
 * 获取代币交换路由信息
 * @param fromToken 源代币地址
 * @param toToken 目标代币地址
 * @param amount 交换数量
 * @returns 路由信息，包括预期输出、手续费、价格影响和汇率
 */
export async function getSwapRoutes(
  fromToken: string,
  toToken: string,
  amount: string
) {
  // Note: This is a simplified version. In reality, you might need to interact with a SunSwap API or smart contract to get actual routes
  const amountIn = Tronweb.toBigNumber(amount);
  const estimatedOut = amountIn.multipliedBy(0.98); // Simulating a 2% slippage
  return [
    {
      route: [fromToken, toToken],
      expectedOutput: estimatedOut.toString(),
      fee: amountIn.multipliedBy(0.003).toString(),
      priceImpact: "2%",
      exchangeRate: estimatedOut.dividedBy(amountIn).toString(),
    },
  ];
}

/**
 * 获取最小购买代币数量
 * @param contract 合约实例
 * @param tokenAddress 代币地址
 * @param trxAmount 购买金额
 * @returns 最小购买代币数量
 */
export async function getMinTokenToBuy(
  contract: any,
  tokenAddress: string,
  trxAmount: string
): Promise<string> {
  const result = await contract
    .getTokenAmountByPurchaseWithFee(tokenAddress, trxAmount)
    .call();
  return result[0].toString();
}

/**
 * 执行 SunSwap 代币交换
 * @param tokenInAddress 输入代币地址
 * @param tokenOutAddress 输出代币地址
 * @param amountIn 输入金额
 * @param amountOutMin 最小输出金额（考虑滑点）
 * @param to 接收地址
 * @param deadline 交易截止时间戳
 * @returns 交易结果
 */
export async function executeSwap(
  tokenInAddress: string,
  tokenOutAddress: string,
  amountIn: string,
  amountOutMin: string,
  to: string,
  deadline: number
) {
  const sunswapRouter = await Tronweb.contract().at(SUNSWAP_ROUTER_ADDRESS);
  const transaction = await sunswapRouter
    .swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      [tokenInAddress, tokenOutAddress],
      to,
      deadline
    )
    .send();
  return transaction;
}

/**
 * 在 Sunpump 平台执行代币购买
 * @param address 要购买的代币地址
 * @param amountTRX 要支付的 TRX 数量
 * @returns 交易结果
 */
export async function executeSunpumpSwap(address: string, amountTRX: number) {
  try {
    const sunpumpContract = await Tronweb.contract(
      SUNPUMP_ABI.entrys as any,
      SUNPUMP_CONTRACT_ADDRESS
    );
    const minTokenToBuy = await getMinTokenToBuy(
      sunpumpContract,
      address,
      amountTRX.toString()
    );
    const transaction = await sunpumpContract
      .purchaseToken(address, minTokenToBuy)
      .send({
        feeLimit: 10 * 10 ** 6, // maximum fee, 1000 TRX for now
        callValue: amountTRX * 10 ** 6,
      });
    return transaction;
  } catch (error) {
    console.error("Error executing Sunpump swap:", error);
    throw error;
  }
}
