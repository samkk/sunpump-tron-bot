import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import { TronWeb } from "tronweb";
import {
  SUNSWAP_FACTORY_ABI,
  SUNSWAP_FACTORY_ADDRESS,
  SUNSWAP_PAIR_ABI,
  SUNSWAP_ROUTER_ADDRESS,
  TRC20_ABI,
  WTRX_ADDRESS,
  WTRX_DECIMALS,
} from "../config";
import logger from "../log";
import { SUNSWAP_ROUTER_ABI } from "./../config";
import ApiKeyManager from "./apiKeys";
import { errorLOG } from "./logs";

let tronWebInstance: TronWeb;
try {
  const envConfig = dotenv.config();
  const env = envConfig.parsed;
  // 检查必要的环境变量
  if (!env?.TRON_FULL_HOST) {
    throw new Error("环境变量TRON_FULL_HOST缺失");
  }
  const apiKey = ApiKeyManager.getRandomApiKey();
  tronWebInstance = new TronWeb({
    fullHost: env.TRON_FULL_HOST,
    headers: { "TRON-PRO-API-KEY": apiKey },
    privateKey: env.PRIVATE_KEY,
  });
  logger.info(`TronWeb已初始化，使用API Key: ${apiKey.substring(0, 4)}****`);
} catch (error) {
  console.error(`初始化TronWeb失败: ${error}`);
  process.exit(1);
}

// 导出已初始化的TronWeb实例，便于其他模块直接使用
export const Tronweb = tronWebInstance;

/**
 * SniperUtils 类 - Tron 区块链上的代币狙击工具类
 * 提供与 Tron 区块链、SunSwap 交互的工具方法，用于自动化代币交易
 */
class SniperUtils {
  // TronWeb 实例，使用单例模式
  private static instance: TronWeb = tronWebInstance;
  // 缓存的 TRX 价格，减少 API 调用
  private static cachedTRXPrice: number | null = null;
  // 价格缓存的时间戳，用于判断缓存是否过期
  private static cacheTimestamp: number = 0;
  // 记录上次刷新API Key的时间，防止频繁刷新
  private static lastRefreshTime: number = 0;
  // API Key刷新的最小间隔时间（毫秒）
  private static MIN_REFRESH_INTERVAL: number = 3000;
  // 添加初始化标志 - 已经在外部初始化了
  private static isInitialized: boolean = true;

  // 私有构造函数，防止直接实例化
  private constructor() {}

  /* ------------------------------ */
  /*          TRONWEB PART          */
  /* ------------------------------ */

  /**
   * 获取 TronWeb 实例
   * @returns TronWeb 实例
   */
  static getInstance() {
    return this.instance;
  }

  /**
   * 检查 TronWeb 是否已初始化
   * @returns 是否已初始化
   */
  static isInitializedStatus() {
    return this.isInitialized;
  }

  /**
   * 设置 TronWeb 实例
   * 用于手动设置实例，主要供内部或测试使用
   * @param tronWebInstance TronWeb 实例
   */
  static setInstance(newTronWebInstance: TronWeb) {
    this.instance = newTronWebInstance;
    this.isInitialized = true;
  }

  /**
   * 初始化方法（保持兼容性）
   * 由于实例已在模块加载时初始化，此方法只是为了兼容原有代码
   * @returns Promise，始终立即解析
   */
  static async initialize(): Promise<void> {
    // 由于实例已在模块加载时初始化，此方法只返回一个已解析的Promise
    logger.info("TronWeb已在模块加载时初始化，无需再次初始化");
    return Promise.resolve();
  }

  /**
   * 重新获取 TronWeb 实例，使用新的随机 API KEY
   * 用于当前 API KEY 可能达到限制时
   * 添加刷新间隔控制，避免过于频繁地刷新
   * @returns 是否成功刷新
   */
  static async refreshInstance(): Promise<boolean> {
    try {
      const now = Date.now();

      // 检查是否距离上次刷新时间过短
      if (now - this.lastRefreshTime < this.MIN_REFRESH_INTERVAL) {
        // 如果刷新过于频繁，等待一段时间
        const waitTime =
          this.MIN_REFRESH_INTERVAL - (now - this.lastRefreshTime);
        logger.warn(`API Key刷新过于频繁，等待${waitTime}ms后再刷新...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      const { parsed: env } = dotenv.config();

      if (!env || !env.TRON_FULL_HOST || !env.PRIVATE_KEY) {
        throw new Error("环境变量配置不完整");
      }

      // 获取随机API Key
      const apiKey = ApiKeyManager.getRandomApiKey();

      // 重新创建 TronWeb 实例
      this.instance = new TronWeb({
        fullHost: env.TRON_FULL_HOST,
        headers: { "TRON-PRO-API-KEY": apiKey },
        privateKey: env.PRIVATE_KEY,
      });

      // 更新最后刷新时间
      this.lastRefreshTime = Date.now();

      logger.info(
        `TronWeb 已刷新，使用新的 API Key: ${apiKey.substring(0, 4)}****`
      );
      return true;
    } catch (error) {
      logger.error(`${errorLOG} 刷新 TronWeb 实例失败: ${error}`);
      return false;
    }
  }

  /**
   * 设置新的私钥
   * @param privateKey 要设置的私钥
   */
  static async setPrivateKey(privateKey: string) {
    this.instance.setPrivateKey(privateKey);
  }

  /* ------------------------------ */
  /*         ACCOUNT PART           */
  /* ------------------------------ */

  /**
   * 从私钥导入账户
   * @param privateKey 私钥
   * @returns 账户地址
   */
  static importAccount(privateKey: string) {
    return this.instance.address.fromPrivateKey(privateKey);
  }

  /**
   * 创建新的 Tron 账户
   * @returns 新创建的账户信息
   */
  static async createAccount() {
    return await this.instance.createAccount();
  }

  /**
   * 获取账户信息
   * @param accountAddress 账户地址
   * @returns 账户详细信息
   */
  static async getAccount(accountAddress: string) {
    return await this.instance.trx.getAccount(accountAddress);
  }

  /**
   * 获取账户 TRX 余额
   * @param accountAddress 账户地址
   * @returns TRX 余额
   */
  static async getBalance(accountAddress: string) {
    return await this.instance.trx.getBalance(accountAddress);
  }

  /**
   * 获取账户所有 TRC20 代币余额
   * @param accountAddress 账户地址
   * @returns 代币余额数组
   */
  static async getTokensBalance(accountAddress: string) {
    try {
      // 调用 Tron API 获取代币列表
      const res = await fetch(
        `https://apilist.tronscanapi.com/api/account/tokens?address=${accountAddress}&start=0&limit=150&token=&hidden=0&show=0&sortType=0&sortBy=0`
      );
      const data = await res.json();
      if (!data.data) {
        throw new Error("No data found");
      }
      // 转换 API 返回的代币数据格式
      const tokens = data.data.map((token: any) => {
        const type = token.tokenType;
        // 忽略 TRC10 代币
        if (type === "trc10") return;
        return {
          address: token.tokenId,
          name: token.tokenName,
          symbol: token.tokenAbbr,
          balance: token.balance,
          decimals: token.tokenDecimal,
          type: token.tokenType,
          logo: token.tokenLogo,
          holders: token.nrOfTokenHolders,
        } as Token;
      });

      if (!tokens) throw new Error("No tokens found");
      // 过滤掉无效的代币
      const finalTokens = tokens.filter((token: Token) => token);
      if (finalTokens.length === 0) return [];
      return finalTokens;
    } catch (error) {
      console.error(`${errorLOG} ${error}`);
      return [];
    }
  }

  /* ------------------------------ */
  /*         CONTRACT PART          */
  /* ------------------------------ */

  /**
   * 获取智能合约的 ABI
   * @param contractAddress 合约地址
   * @returns 合约 ABI
   */
  static async getContractABI(contractAddress: string) {
    return await this.instance.trx.getContract(contractAddress);
  }

  /**
   * 获取合约实例
   * @param abi 合约 ABI
   * @param contractAddress 合约地址
   * @returns 合约实例
   */
  static async getContractInstance(abi: any, contractAddress: string) {
    return await this.instance.contract(abi, contractAddress);
  }

  /* ------------------------------ */
  /*           SUNSWAP PART         */
  /* ------------------------------ */

  /**
   * 获取代币与 WTRX 的交易对地址
   * @param tokenAddress 代币地址
   * @returns 交易对地址，如果不存在返回 null
   */
  static async getPairAddress(tokenAddress: string) {
    try {
      // 获取 SunSwap 工厂合约实例
      const contract = await this.getContractInstance(
        SUNSWAP_FACTORY_ABI.entrys,
        SUNSWAP_FACTORY_ADDRESS
      );

      if (!contract) throw new Error("SunSwap factory contract not found");

      // 调用工厂合约获取交易对地址
      const encodedPairAddress = await contract
        .getPair(tokenAddress, WTRX_ADDRESS)
        .call();

      // 检查返回的地址是否有效（零地址表示交易对不存在）
      if (
        !encodedPairAddress ||
        encodedPairAddress === "410000000000000000000000000000000000000000"
      )
        return null;

      // 将 Hex 地址转换为 Base58 格式
      return this.getAddressFromHex(encodedPairAddress);
    } catch (error) {
      console.error(`${errorLOG} ${error}`);
      return null;
    }
  }

  /**
   * 获取交易对详细信息
   * @param pairAddress 交易对地址
   * @returns 交易对信息，包括代币地址、代币储备量、WTRX 储备量和时间戳
   */
  static async getPairInformations(pairAddress: string) {
    try {
      // 获取交易对合约实例
      const contract = await this.getContractInstance(
        SUNSWAP_PAIR_ABI.entrys,
        pairAddress
      );
      if (!contract) throw new Error("No contract found");
      // 获取交易对的储备量
      const reserves = (await contract.getReserves().call()) as [
        bigint,
        bigint,
        number
      ];
      if (!reserves) throw new Error("No reserves found");
      // 获取交易对中的两个代币地址
      const token0 = await contract.token0().call();
      const token1 = await contract.token1().call();
      if (!token0 || !token1) throw new Error("No tokens found");
      // 判断 WTRX 是否为 token0，并相应地处理返回数据
      if (this.getAddressFromHex(token0) === WTRX_ADDRESS) {
        const tokenAddress = this.getAddressFromHex(token1);
        if (!tokenAddress) throw new Error("No token addresses found");
        const reserveWTRX = new BigNumber(reserves[0].toString());
        const reserveToken = new BigNumber(reserves[1].toString());
        const timestamp = reserves[2];

        return {
          tokenAddress,
          reserveToken,
          reserveWTRX,
          timestamp,
        };
      }

      const tokenAddress = this.getAddressFromHex(token0);

      if (!tokenAddress) throw new Error("No token addresses found");

      const reserveToken = new BigNumber(reserves[0].toString());
      const reserveWTRX = new BigNumber(reserves[1].toString());
      const timestamp = reserves[2];

      return {
        tokenAddress,
        reserveToken,
        reserveWTRX,
        timestamp,
      };
    } catch (error) {
      console.error(`${errorLOG} ${error}`);
      return null;
    }
  }

  /**
   * 获取交易对详细信息 SUNSWAP_ROUTER_ABI
   * @param pairAddress 交易对地址
   * @returns 交易对信息，包括代币地址、代币储备量、WTRX 储备量和时间戳
   */
  static async getRouterInformations(pairAddress: string) {
    try {
      // 获取交易对合约实例
      const contract = await this.getContractInstance(
        SUNSWAP_ROUTER_ABI.entrys,
        SUNSWAP_ROUTER_ADDRESS
      );

      if (!contract) throw new Error("SUNSWAP_ROUTER contract not found");
      // 获取交易对中的两个代币地址
      const token0 = await contract.token0().call();
      const token1 = await contract.token1().call();
      if (!token0 || !token1) throw new Error("No tokens found");
      // 判断 WTRX 是否为 token0，并相应地处理返回数据
      if (this.getAddressFromHex(token0) === WTRX_ADDRESS) {
        const tokenAddress = this.getAddressFromHex(token1);
      }

      const tokenAddress = this.getAddressFromHex(token0);

      if (!tokenAddress) throw new Error("No token addresses found");

      return {
        tokenAddress,
      };
    } catch (error) {
      console.error(`${errorLOG} ${error}`);
      return null;
    }
  }

  /**
   * 代币对代币的交换
   * 直接使用 SUNSWAP_ROUTER_ABI 实现一个代币到另一个代币的交换
   * @param fromTokenAddress 支出代币地址
   * @param toTokenAddress 接收代币地址
   * @param amountIn 支出代币的数量
   * @param slippagePercentage 允许的滑点百分比
   * @param walletAddress 钱包地址
   * @param privateKey 私钥
   * @returns 交易 ID，失败返回 null
   */
  static async swapTokensForTokens(
    fromTokenAddress: string,
    toTokenAddress: string,
    amountIn: number,
    slippagePercentage: number,
    walletAddress: string,
    privateKey: string
  ) {
    try {
      // 检查参数
      if (
        !fromTokenAddress ||
        !toTokenAddress ||
        !amountIn ||
        !slippagePercentage ||
        !walletAddress ||
        !privateKey
      ) {
        throw new Error("必须提供所有参数");
      }
      // 检查是否为同一代币
      if (fromTokenAddress === toTokenAddress) {
        throw new Error("无法交换相同的代币");
      }
      // 获取 fromToken 合约实例以获取代币精度
      const fromTokenContract = await this.getContractInstance(
        TRC20_ABI,
        fromTokenAddress
      );

      if (!fromTokenContract) throw new Error("无法获取源代币合约");

      // 获取代币精度
      const decimals = await fromTokenContract.decimals().call();
      if (!decimals) throw new Error("无法获取代币精度");

      // 计算实际要发送的代币数量（考虑精度）
      const amountToSend = new BigNumber(amountIn)
        .times(new BigNumber(10).pow(decimals))
        .integerValue(BigNumber.ROUND_DOWN);

      // 检查用户代币余额
      const balance = await fromTokenContract.balanceOf(walletAddress).call();
      if (!balance) throw new Error("无法获取代币余额");

      const userBalance = new BigNumber(balance.toString());
      if (userBalance.lt(amountToSend)) {
        throw new Error("代币余额不足");
      }

      // 获取交易路径中的交易对地址，先检查是否有直接的交易对
      let pairAddress = await this.getPairAddress(fromTokenAddress);
      if (!pairAddress) {
        throw new Error(`找不到 ${fromTokenAddress} 与 WTRX 的交易对`);
      }

      let toPairAddress = await this.getPairAddress(toTokenAddress);
      if (!toPairAddress) {
        throw new Error(`找不到 ${toTokenAddress} 与 WTRX 的交易对`);
      }

      // 获取 Router 合约实例
      const routerContract = await this.getContractInstance(
        SUNSWAP_ROUTER_ABI.entrys,
        SUNSWAP_ROUTER_ADDRESS
      );

      if (!routerContract) throw new Error("无法获取路由合约");

      // 设置交易路径：fromToken -> WTRX -> toToken
      const path = [fromTokenAddress, WTRX_ADDRESS, toTokenAddress];

      // 将地址转换为十六进制
      const fromTokenAddressHex = this.getAddressInHex(fromTokenAddress, true);
      const wtrxAddressHex = this.getAddressInHex(WTRX_ADDRESS, true);
      const toTokenAddressHex = this.getAddressInHex(toTokenAddress, true);
      const routerAddressHex = this.getAddressInHex(
        SUNSWAP_ROUTER_ADDRESS,
        false
      );
      const walletAddressHex = this.getAddressInHex(walletAddress, false);

      if (!fromTokenAddressHex || !wtrxAddressHex || !toTokenAddressHex) {
        throw new Error("地址转换失败");
      }

      // 获取预期输出金额
      const amounts = await routerContract
        .getAmountsOut(amountToSend.toString(), [
          fromTokenAddressHex,
          wtrxAddressHex,
          toTokenAddressHex,
        ])
        .call();

      if (!amounts || amounts.length !== 3) {
        throw new Error("获取预期输出金额失败");
      }

      // 计算最小输出金额（考虑滑点）
      const expectedAmountOut = new BigNumber(amounts[2].toString());
      const slippageFactor = new BigNumber(100 - slippagePercentage).div(100);
      const amountOutMin = expectedAmountOut
        .times(slippageFactor)
        .integerValue(BigNumber.ROUND_DOWN)
        .toString();

      // 设置交易截止时间（通常设置为当前时间 + 一定分钟数）
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20分钟后过期

      // 检查授权额度
      const allowance = await this.getAllowance(
        fromTokenAddress,
        walletAddress,
        SUNSWAP_ROUTER_ADDRESS
      );

      // 如果授权额度不足，先进行授权
      if (!allowance || allowance.lt(amountToSend)) {
        const approve = await this.approveToken(
          fromTokenAddress,
          walletAddress,
          SUNSWAP_ROUTER_ADDRESS,
          privateKey
        );

        if (!approve) throw new Error("代币授权失败");

        // 等待授权交易确认
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      // 设置调用合约的参数
      const parameter = [
        { type: "uint256", value: amountToSend.toString() },
        { type: "uint256", value: amountOutMin },
        {
          type: "address[]",
          value: [fromTokenAddressHex, wtrxAddressHex, toTokenAddressHex],
        },
        { type: "address", value: walletAddress },
        { type: "uint256", value: deadline },
      ];

      // 创建交易
      let transaction;
      try {
        const result =
          await this.getInstance().transactionBuilder.triggerSmartContract(
            routerAddressHex,
            "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
            {},
            parameter,
            walletAddressHex
          );
        transaction = result.transaction;
      } catch (error) {
        throw error;
      }

      if (!transaction) throw new Error("创建交易失败");

      // 使用私钥签名交易
      const signedTransaction = await this.getInstance().trx.sign(
        transaction,
        privateKey
      );

      if (!signedTransaction) throw new Error("签名交易失败");

      // 广播交易到网络
      let broadcast;
      try {
        broadcast = await this.getInstance().trx.sendRawTransaction(
          signedTransaction
        );
      } catch (error) {
        throw error;
      }
      if (!broadcast) throw new Error("广播交易失败");
      logger.info(
        `用户交换了 ${amountIn} ${fromTokenAddress} 到 ${toTokenAddress}`,
        broadcast
      );
      const result = broadcast.result;
      const tx = broadcast.transaction;
      if (!result || !tx) throw new Error("交易执行失败");
      return tx.txID;
    } catch (error) {
      logger.error(`${errorLOG} ${error}`);
      return null;
    }
  }

  /**
   * 计算使用 WTRX 购买代币时的最小输出数量
   * 考虑交易滑点，确保不会因为价格波动而得到过少的代币
   * @param pairAddress 交易对地址
   * @param amountIn 输入的 WTRX 数量
   * @param slippagePercentage 允许的滑点百分比
   * @returns 考虑滑点后的最小输出代币数量
   */
  static async getAmountOutMinUsingWTRX(
    pairAddress: string,
    amountIn: number,
    slippagePercentage: number
  ) {
    // 获取交易对储备信息
    const reserves = await this.getPairInformations(pairAddress);

    if (!reserves) {
      throw new Error("No reserves found");
    }

    // 获取代币合约实例以查询精度
    const tokenContract = await this.getContractInstance(
      TRC20_ABI,
      reserves.tokenAddress
    );

    if (!tokenContract) {
      throw new Error("No token contract found");
    }

    // 获取代币精度
    const tokenDecimals = await tokenContract.decimals().call();

    if (!tokenDecimals) {
      throw new Error("No token decimals found");
    }

    // 转换为人类可读的数字（考虑精度）
    const reserveToken = reserves.reserveToken.div(
      new BigNumber(10).pow(tokenDecimals)
    );

    const reserveWTRX = reserves.reserveWTRX.div(
      new BigNumber(10).pow(WTRX_DECIMALS)
    );

    // 使用 x * y = k 公式计算预期输出量
    const amountOutMin = reserveToken
      .multipliedBy(new BigNumber(amountIn))
      .div(reserveWTRX);

    // 计算滑点金额
    const slippageAmount = amountOutMin
      .multipliedBy(new BigNumber(slippagePercentage))
      .div(new BigNumber(100));

    // 返回考虑滑点后的最小输出数量
    return amountOutMin.minus(slippageAmount).toFixed(0);
  }

  /**
   * 计算使用代币兑换 WTRX 时的最小输出数量
   * 考虑交易滑点，确保不会因为价格波动而得到过少的 WTRX
   * @param pairAddress 交易对地址
   * @param amountIn 输入的代币数量
   * @param slippagePercentage 允许的滑点百分比
   * @returns 考虑滑点后的最小输出 WTRX 数量
   */
  static async getAmountOutMinUsingToken(
    pairAddress: string,
    amountIn: number,
    slippagePercentage: number
  ) {
    // 获取交易对储备信息
    const reserves = await this.getPairInformations(pairAddress);

    if (!reserves) {
      throw new Error("No reserves found");
    }

    // 获取代币合约实例以查询精度
    const tokenContract = await this.getContractInstance(
      TRC20_ABI,
      reserves.tokenAddress
    );

    if (!tokenContract) {
      throw new Error("No token contract found");
    }

    // 获取代币精度
    const tokenDecimals = await tokenContract.decimals().call();

    if (!tokenDecimals) {
      throw new Error("No token decimals found");
    }

    // 转换为人类可读的数字（考虑精度）
    const reserveToken = reserves.reserveToken.div(
      new BigNumber(10).pow(tokenDecimals)
    );

    const reserveWTRX = reserves.reserveWTRX.div(
      new BigNumber(10).pow(WTRX_DECIMALS)
    );

    // 使用 x * y = k 公式计算预期输出量
    const amountOutMin = reserveWTRX
      .multipliedBy(new BigNumber(amountIn))
      .div(reserveToken);

    // 计算滑点金额
    const slippageAmount = amountOutMin
      .multipliedBy(new BigNumber(slippagePercentage))
      .div(new BigNumber(100));

    // 返回考虑滑点后的最小输出数量
    return amountOutMin.minus(slippageAmount).toFixed(0);
  }

  /**
   * 处理 API 错误，如果是 API KEY 限制错误，则自动刷新 API KEY
   * @param error 捕获的错误
   * @param operation 当前执行的操作描述，用于日志
   * @returns 是否成功处理错误(刷新了 API KEY)
   */
  static async handleApiError(error: any, operation: string): Promise<boolean> {
    // 如果错误是 API 限制相关的
    if (
      error.response &&
      (error.response.status === 429 ||
        (typeof error.message === "string" &&
          (error.message.includes("api key") ||
            error.message.includes("API key") ||
            error.message.includes("rate limit") ||
            error.message.includes("Rate limit"))))
    ) {
      console.warn(`${errorLOG} API 密钥限制被触发，尝试刷新 API KEY...`);
      const refreshed = await this.refreshInstance();

      if (refreshed) {
        console.log(`成功刷新 API KEY，将重试 ${operation}`);
        return true;
      } else {
        console.error(`无法刷新 API KEY，${operation} 失败`);
        return false;
      }
    }

    // 如果不是 API 限制相关的错误，打印错误并继续
    console.error(`${errorLOG} ${operation} 失败: ${error}`);
    return false;
  }

  /**
   * 使用 WTRX 购买代币
   * 核心交易功能，用于狙击新代币
   * @param tokenAddress 要购买的代币地址
   * @param pairAddress 交易对地址
   * @param amountInWTRX 输入的 WTRX 数量
   * @param slippagePercentage 允许的滑点百分比
   * @param walletAddress 钱包地址
   * @param privateKey 私钥
   * @returns 交易 ID，失败返回 null
   */
  static async buyToken(
    tokenAddress: string,
    pairAddress: string,
    amountInWTRX: number,
    slippagePercentage: number,
    walletAddress: string,
    privateKey: string
  ): Promise<string | null> {
    try {
      // 计算考虑滑点的最小输出量
      const amountOutMin = await this.getAmountOutMinUsingWTRX(
        pairAddress,
        amountInWTRX,
        slippagePercentage
      );
      if (!amountOutMin) throw new Error("No amount found");
      // 计算交易截止时间（通常为当前时间 + 2分钟）
      const deadline = this.getDeadline();
      if (!deadline) throw new Error("No deadline found");
      // 将所有地址转换为合适的 Hex 格式
      const wrtxAddressInHEX = this.getAddressInHex(WTRX_ADDRESS, true);
      const tokenAddressInHEX = this.getAddressInHex(tokenAddress, true);
      const routerAddressInHEX = this.getAddressInHex(
        SUNSWAP_ROUTER_ADDRESS,
        false
      );
      const walletAddressInHEX = this.getAddressInHex(walletAddress, false);
      if (!tokenAddressInHEX || !wrtxAddressInHEX)
        throw new Error("No address found");
      // 设置交易选项，包括发送的 TRX 数量
      const options = {
        callValue: parseInt(
          new BigNumber(amountInWTRX)
            .multipliedBy(new BigNumber(10).pow(WTRX_DECIMALS))
            .toString()
        ),
      };
      // 设置调用合约的参数
      const parameter = [
        { type: "uint256", value: amountOutMin.toString() },
        { type: "address[]", value: [wrtxAddressInHEX, tokenAddressInHEX] },
        { type: "address", value: walletAddress },
        { type: "uint256", value: deadline },
      ];
      // 创建交易
      let transaction;
      try {
        const result =
          await this.getInstance().transactionBuilder.triggerSmartContract(
            routerAddressInHEX,
            "swapExactETHForTokens(uint256,address[],address,uint256)",
            options,
            parameter,
            walletAddressInHEX
          );
        transaction = result.transaction;
      } catch (error) {
        throw error;
      }
      if (!transaction) throw new Error("No transaction found");
      // 使用私钥签名交易
      const signedTransaction = await this.getInstance().trx.sign(
        transaction,
        privateKey
      );
      if (!signedTransaction) throw new Error("No signed transaction found");
      // 广播交易到网络
      let broadcast;
      try {
        broadcast = await this.getInstance().trx.sendRawTransaction(
          signedTransaction
        );
      } catch (error) {
        throw error;
      }
      if (!broadcast) throw new Error("No broadcast found");
      logger.info(
        `The user bought ${amountInWTRX} WTRX of ${tokenAddress}`,
        broadcast
      );
      const result = broadcast.result;
      const tx = broadcast.transaction;
      if (!result || !tx) throw new Error("No result or transaction found");
      // 获取代币合约实例以检查精度
      const tokenContract = await this.getContractInstance(
        TRC20_ABI,
        tokenAddress
      );
      if (!tokenContract) throw new Error("No token contract found");
      const decimals = await tokenContract.decimals().call();
      if (!decimals) throw new Error("No decimals found");
      // 授权路由合约使用我们的代币，以便将来可以卖出
      const approve = await this.approveToken(
        tokenAddress,
        walletAddress,
        SUNSWAP_ROUTER_ADDRESS,
        privateKey
      );
      if (!approve) throw new Error("No approve found");
      return tx.txID;
    } catch (error) {
      logger.error(`${errorLOG} ${error}`);
      return null;
    }
  }

  /**
   * 卖出代币，将代币换成 WTRX
   * @param tokenAddress 要卖出的代币地址
   * @param pairAddress 交易对地址
   * @param amountInTokens 要卖出的代币数量
   * @param slippagePercentage 允许的滑点百分比
   * @param walletAddress 钱包地址
   * @param privateKey 私钥
   * @returns 交易 ID，失败返回 null
   */
  static async sellToken(
    tokenAddress: string,
    pairAddress: string,
    amountInTokens: number,
    slippagePercentage: number,
    walletAddress: string,
    privateKey: string
  ): Promise<string | null> {
    try {
      // 获取代币合约实例以查询精度和余额
      const tokenContract = await this.getContractInstance(
        TRC20_ABI,
        tokenAddress
      );

      if (!tokenContract) throw new Error("No token contract found");

      // 获取代币精度
      const decimals = await tokenContract.decimals().call();

      if (!decimals) throw new Error("No decimals found");

      // 对金额进行四舍五入，避免精度问题
      const roundedAmountInTokens = Math.floor(amountInTokens * 10) / 10;

      // 转换为代币的实际数量（考虑精度）
      const amountToSend = new BigNumber(roundedAmountInTokens)
        .multipliedBy(new BigNumber(10).pow(decimals))
        .toFixed(0);

      // 检查代币余额是否足够
      const tokenBalance = await tokenContract.balanceOf(walletAddress).call();

      if (new BigNumber(tokenBalance).lt(amountToSend))
        throw new Error("Insufficient balance");

      // 计算考虑滑点的最小输出 WTRX 数量
      const amountOutMin = await this.getAmountOutMinUsingToken(
        pairAddress,
        roundedAmountInTokens,
        slippagePercentage
      );

      if (!amountOutMin) throw new Error("No amount found");

      // 计算交易截止时间
      const deadline = this.getDeadline();

      if (!deadline) throw new Error("No deadline found");

      // 检查代币授权
      const allowance = await this.getAllowance(
        tokenAddress,
        walletAddress,
        SUNSWAP_ROUTER_ADDRESS
      );

      // 如果授权额度不足，先进行授权
      if (!allowance || new BigNumber(allowance).lt(amountToSend)) {
        let approve;
        try {
          approve = await this.approveToken(
            tokenAddress,
            walletAddress,
            SUNSWAP_ROUTER_ADDRESS,
            privateKey
          );
        } catch (error) {
          // 处理 API KEY 限制错误
          if (await this.handleApiError(error, "授权代币")) {
            return this.sellToken(
              tokenAddress,
              pairAddress,
              amountInTokens,
              slippagePercentage,
              walletAddress,
              privateKey
            );
          }
          throw error;
        }

        if (!approve) throw new Error("No approve found");

        // 等待授权交易确认
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      // 将所有地址转换为合适的 Hex 格式
      const wrtxAddressInHEX = this.getAddressInHex(WTRX_ADDRESS, true);
      const tokenAddressInHEX = this.getAddressInHex(tokenAddress, true);
      const routerAddressInHEX = this.getAddressInHex(
        SUNSWAP_ROUTER_ADDRESS,
        false
      );
      const walletAddressInHEX = this.getAddressInHex(walletAddress, false);

      if (!tokenAddressInHEX || !wrtxAddressInHEX)
        throw new Error("No address found");

      // 设置调用合约的参数
      const parameter = [
        { type: "uint256", value: amountToSend.toString() },
        { type: "uint256", value: amountOutMin.toString() },
        { type: "address[]", value: [tokenAddressInHEX, wrtxAddressInHEX] },
        { type: "address", value: walletAddress },
        { type: "uint256", value: deadline },
      ];

      // 创建交易
      let transaction;
      try {
        const result =
          await this.getInstance().transactionBuilder.triggerSmartContract(
            routerAddressInHEX,
            "swapExactTokensForETH(uint256,uint256,address[],address,uint256)",
            {},
            parameter,
            walletAddressInHEX
          );
        transaction = result.transaction;
      } catch (error) {
        // 处理 API KEY 限制错误
        if (await this.handleApiError(error, "创建卖出交易")) {
          return this.sellToken(
            tokenAddress,
            pairAddress,
            amountInTokens,
            slippagePercentage,
            walletAddress,
            privateKey
          );
        }
        throw error;
      }

      if (!transaction) throw new Error("No transaction found");

      // 使用私钥签名交易
      const signedTransaction = await this.getInstance().trx.sign(
        transaction,
        privateKey
      );

      if (!signedTransaction) throw new Error("No signed transaction found");

      // 广播交易到网络
      let broadcast;
      try {
        broadcast = await this.getInstance().trx.sendRawTransaction(
          signedTransaction
        );
      } catch (error) {
        // 处理 API KEY 限制错误
        if (await this.handleApiError(error, "广播卖出交易")) {
          return this.sellToken(
            tokenAddress,
            pairAddress,
            amountInTokens,
            slippagePercentage,
            walletAddress,
            privateKey
          );
        }
        throw error;
      }

      if (!broadcast) throw new Error("No broadcast found");

      console.log(
        `The user sold ${amountInTokens} of ${tokenAddress}`,
        broadcast
      );

      const result = broadcast.result;
      const tx = broadcast.transaction;

      if (!result || !tx) throw new Error("No result or transaction found");

      return tx.txID;
    } catch (error) {
      console.error(`${errorLOG} ${error}`);
      return null;
    }
  }

  /* ------------------------------ */
  /*           TOKEN PART           */
  /* ------------------------------ */

  /**
   * 获取代币授权额度
   * 检查已授权给 spender 的代币数量
   * @param tokenAddress 代币地址
   * @param ownerAddress 代币所有者地址
   * @param spenderAddress 被授权方地址
   * @returns 授权额度，失败返回 null
   */
  static async getAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string
  ) {
    try {
      // 获取代币合约实例
      const tokenContract = await this.getContractInstance(
        TRC20_ABI,
        tokenAddress
      );

      if (!tokenContract) throw new Error("No token contract found");

      // 调用合约的 allowance 方法
      const allowance = await tokenContract
        .allowance(ownerAddress, spenderAddress)
        .call();

      if (!allowance) throw new Error("No allowance found");

      return new BigNumber(allowance.toString());
    } catch (error) {
      console.error(`${errorLOG} ${error}`);
      return null;
    }
  }

  /**
   * 授权代币使用权限
   * 允许 DEX 路由合约代表用户转移代币，用于交易
   * @param tokenAddress 代币地址
   * @param walletAddress 钱包地址
   * @param ownerAddress 被授权方地址
   * @param privateKey 私钥
   * @returns 交易 ID，失败返回 null
   */
  static async approveToken(
    tokenAddress: string,
    walletAddress: string,
    ownerAddress: string,
    privateKey: string
  ) {
    try {
      // 获取代币合约实例
      const tokenContract = await this.getContractInstance(
        TRC20_ABI,
        tokenAddress
      );

      if (!tokenContract) throw new Error("No token contract found");

      // 设置调用合约的参数
      // 授权金额设为最大值，避免多次授权
      const parameter = [
        { type: "address", value: ownerAddress },
        {
          type: "uint256",
          value:
            "115792089237316195423570985008687907853269984665640564039457584007913129639935",
        },
      ];

      // 创建交易
      const { transaction } =
        await this.getInstance().transactionBuilder.triggerSmartContract(
          tokenAddress,
          "approve(address,uint256)",
          {},
          parameter,
          walletAddress
        );

      if (!transaction) throw new Error("No transaction found");
      // 使用私钥签名交易
      const signedTransaction = await this.getInstance().trx.sign(
        transaction,
        privateKey
      );
      if (!signedTransaction) throw new Error("No signed transaction found");
      // 广播交易到网络
      const broadcast = await this.getInstance().trx.sendRawTransaction(
        signedTransaction
      );
      if (!broadcast) throw new Error("No broadcast found");
      console.log(`The user approved ${tokenAddress}`, broadcast);
      const result = broadcast.result;
      const tx = broadcast.transaction;
      if (!result || !tx) throw new Error("No result or transaction found");
      return tx.txID;
    } catch (error) {
      console.error(`${errorLOG} ${error}`);
      return null;
    }
  }

  /**
   * 获取 TRX 当前价格
   * 使用缓存机制减少 API 调用次数
   * @returns TRX 价格（美元），出错返回 0
   */
  static async getPriceOfTRX() {
    // 缓存有效期为 1 分钟
    const CACHE_DURATION = 60 * 1000;
    // 如果缓存有效，直接返回缓存的价格
    if (
      this.cachedTRXPrice &&
      Date.now() - this.cacheTimestamp < CACHE_DURATION
    )
      return this.cachedTRXPrice;

    try {
      // 调用 API 获取 TRX 价格
      const res = await fetch(
        "https://apilist.tronscanapi.com/api/token/price?token=trx"
      );
      const data = await res.json();

      if (!data || !data.price_in_usd) throw new Error("No data found");

      // 更新缓存
      this.cachedTRXPrice = data.price_in_usd;
      this.cacheTimestamp = Date.now();

      return this.cachedTRXPrice;
    } catch (error) {
      console.error(`${errorLOG} ${error}`);
      return 0;
    }
  }

  /**
   * 获取代币详细信息
   * 通过 DEX Screener API 获取代币价格、交易量、流动性等信息
   * @param pairAddress 交易对地址
   * @returns 代币详细信息，包括名称、符号、价格、交易量、流动性等
   */
  static async getTokenInformations(pairAddress: string) {
    try {
      // 调用 DexScreener API 获取代币信息
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/pairs/tron/${pairAddress}`
      );
      const data = (await res.json()) as {
        pair: {
          baseToken: {
            name: string;
            symbol: string;
          };
          priceNative: string;
          priceUsd: string;
          volume: {
            h24: number;
          };
          liquidity: {
            usd: number;
            base: number;
            quote: number;
          };
          fdv: number;
          pairCreatedAt: number;
        };
      };

      if (!data || !data.pair) throw new Error("No data found");
      const pair = data.pair;
      // 获取 TRX 价格用于计算市值
      const price = await this.getPriceOfTRX();

      if (!price) throw new Error("No price found");

      // 计算美元市值
      const marketCapInUSD = pair.fdv * price;

      // 返回格式化的代币信息
      return {
        name: pair.baseToken.name,
        symbol: pair.baseToken.symbol,
        tokenPriceInUSD: Number(pair.priceUsd),
        volumeInUSD: pair.volume.h24,
        liquidityInUSD: pair.liquidity.usd,
        marketCapInUSD,
        pairCreatedAt: pair.pairCreatedAt,
      };
    } catch (error) {
      console.error(`${errorLOG} ${error}`);
      return null;
    }
  }

  /**
   * 获取sunpump代币信息
   */
  static async getSunpumpTokenInformations(tokenAddress: string) {
    try {
      // 调用 Sunpump API 获取代币信息
      const res = await fetch(
        `https://api-v2.sunpump.meme/pump-api/token/${tokenAddress}`
      );
      if (!res.ok) {
        throw new Error(`API 请求失败: ${res.status} ${res.statusText}`);
      }
      const response = await res.json();
      if (response.code !== 0 || !response.data) {
        throw new Error(`获取代币信息失败: ${response.msg || "未知错误"}`);
      }
      const tokenData = response.data;
      return {
        id: tokenData.id,
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: tokenData.decimals,
        ownerAddress: tokenData.ownerAddress,
        contractAddress: tokenData.contractAddress,
        swapPoolAddress: tokenData.swapPoolAddress,
        description: tokenData.description,
        logoUrl: tokenData.logoUrl,
        twitterUrl: tokenData.twitterUrl,
        telegramUrl: tokenData.telegramUrl,
        websiteUrl: tokenData.websiteUrl,
        status: tokenData.status,
        totalSupply: tokenData.totalSupply,
        priceInTrx: tokenData.priceInTrx,
        marketCap: tokenData.marketCap,
        virtualLiquidity: tokenData.virtualLiquidity,
        volume24Hr: tokenData.volume24Hr,
        priceChange24Hr: tokenData.priceChange24Hr,
        pumpPercentage: tokenData.pumpPercentage,
        trxPriceInUsd: tokenData.trxPriceInUsd,
        holders: tokenData.holders,
        tokenCreatedTime: tokenData.tokenCreatedInstant
          ? new Date(tokenData.tokenCreatedInstant * 1000)
          : null,
        tokenLaunchedTime: tokenData.tokenLaunchedInstant
          ? new Date(tokenData.tokenLaunchedInstant * 1000)
          : null,
      };
    } catch (error) {
      console.error(`${errorLOG} ${error}`);
      return null;
    }
  }

  /* ------------------------------ */
  /*           UTILS PART           */
  /* ------------------------------ */

  /**
   * 将 Hex 格式地址转换为 Base58 格式
   * @param hex Hex 格式的地址
   * @returns Base58 格式的地址
   */
  static getAddressFromHex(hex: string) {
    return this.instance.address.fromHex(hex);
  }

  /**
   * 将 Base58 格式地址转换为 Hex 格式
   * @param address Base58 格式的地址
   * @param withPrefix 是否包含 0x 前缀
   * @returns Hex 格式的地址
   */
  static getAddressInHex(address: string, withPrefix: boolean) {
    const addressInHex = this.instance.address.toHex(address);
    return withPrefix ? "0x" + addressInHex.slice(2) : addressInHex;
  }

  /**
   * 计算交易截止时间
   * 通常设为当前时间 + 2 分钟
   * @returns 交易截止时间的 UNIX 时间戳（秒）
   */
  static getDeadline() {
    return Math.floor(Date.now() / 1000) + 60 * 2;
  }

  /**
   * 转账手续费到指定钱包
   * @param tokenAddress 代币地址
   * @param fromAddress 用户钱包地址
   * @param feeWalletAddress 手续费接收钱包
   * @param feeAmount 手续费金额
   * @param privateKey 用户私钥
   * @returns 交易ID，失败返回null
   */
  static async transferFee(
    tokenAddress: string,
    fromAddress: string,
    feeWalletAddress: string,
    feeAmount: number,
    privateKey: string
  ) {
    try {
      // 获取代币合约实例
      const tokenContract = await this.getContractInstance(
        TRC20_ABI,
        tokenAddress
      );
      if (!tokenContract) throw new Error("无法获取代币合约");
      // 获取代币精度
      const decimals = await tokenContract.decimals().call();
      if (!decimals) throw new Error("无法获取代币精度");
      // 计算实际转账金额（考虑精度）
      const amountToSend = new BigNumber(feeAmount)
        .times(new BigNumber(10).pow(decimals))
        .integerValue(BigNumber.ROUND_DOWN);

      // 设置调用合约的参数
      const parameter = [
        { type: "address", value: feeWalletAddress },
        { type: "uint256", value: amountToSend.toString() },
      ];

      // 创建交易
      const { transaction } =
        await this.getInstance().transactionBuilder.triggerSmartContract(
          tokenAddress,
          "transfer(address,uint256)",
          {},
          parameter,
          fromAddress
        );

      if (!transaction) throw new Error("创建手续费转账交易失败");

      // 签名交易
      const signedTransaction = await this.getInstance().trx.sign(
        transaction,
        privateKey
      );

      if (!signedTransaction) throw new Error("签名手续费转账交易失败");

      // 广播交易
      const broadcast = await this.getInstance().trx.sendRawTransaction(
        signedTransaction
      );

      if (!broadcast) throw new Error("广播手续费转账交易失败");

      logger.info(`已收取${feeAmount}代币作为手续费，转入${feeWalletAddress}`);

      return broadcast.transaction.txID;
    } catch (error) {
      logger.error(`手续费转账失败: ${error}`);
      return null;
    }
  }
}

export default SniperUtils;
