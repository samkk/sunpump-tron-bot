import "dotenv/config";
import { EventEmitter } from "events";
import { SUNSWAP_NEW_TOKEN } from "./config";
import logger from "./log";
import SniperUtils from "./utils/tronWeb";

/**
 * 简易区块链扫描器
 * 只用于扫描Tron区块链上的新创建交易对并打印信息
 */
export class BlockchainScanner extends EventEmitter {
  private running: boolean = false;
  private lastProcessedBlockNumber: number = 0;
  private pollInterval: number = 3000; // 轮询间隔，单位毫秒
  private pollingTimer: NodeJS.Timeout | null = null;

  // 交易队列相关属性
  private transactionQueue: any[] = []; // 等待处理的交易队列
  private processedTxIDs: Set<string> = new Set(); // 存储已处理的交易ID，避免重复处理
  private isProcessingQueue: boolean = false; // 是否正在处理队列
  private queueProcessingInterval: number = 100; // 队列处理间隔，单位毫秒
  private maxQueueSize: number = 50000; // 队列最大容量，避免内存溢出

  constructor() {
    super();
  }

  /**
   * 初始化扫描器
   */
  public async initialize(): Promise<void> {
    try {
      await this.initializeTronWeb();
      if (!SniperUtils.getInstance()) {
        throw new Error("TronWeb 实例初始化失败");
      }
      const currentBlock = await this.getCurrentBlockWithRetry();
      if (
        currentBlock &&
        currentBlock.block_header &&
        currentBlock.block_header.raw_data
      ) {
        const blockNumber = currentBlock.block_header.raw_data.number;
        this.lastProcessedBlockNumber = blockNumber;
        logger.info(
          `区块链扫描器初始化成功，当前区块高度: ${this.lastProcessedBlockNumber}`
        );
      } else {
        logger.error(`获取当前区块返回的数据格式无效`);
      }
    } catch (error: unknown) {
      logger.error(`区块链扫描器初始化失败: ${error}`);
      throw error;
    }
  }

  /**
   * 初始化TronWeb
   */
  private async initializeTronWeb(): Promise<void> {
    logger.info(`正在初始化 TronWeb...`);
    await SniperUtils.initialize();
    const instance = SniperUtils.getInstance();
    if (!instance) {
      throw new Error("TronWeb 实例创建失败");
    }
    const nodeInfo = await instance.trx.getNodeInfo();
    if (!nodeInfo) {
      throw new Error("无法连接到 Tron 节点");
    }
  }

  /**
   * 获取当前区块，带重试机制
   */
  private async getCurrentBlockWithRetry(): Promise<any> {
    let retries = 0;
    const maxRetries = 5;
    while (retries < maxRetries) {
      try {
        const currentBlock =
          await SniperUtils.getInstance().trx.getCurrentBlock();
        return currentBlock;
      } catch (error: any) {
        retries++;
        const errorMsg = String(error);
        if (errorMsg.includes("403")) {
          const waitTime = 31000; // 等待31秒，确保超过TronGrid的30秒封禁期
          logger.error(
            `获取区块失败: TronGrid限流(403)，等待${waitTime / 1000}秒后重试...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          await SniperUtils.refreshInstance();
          logger.info(`限流等待结束，准备重试...`);
        }
        // 其他错误
        else {
          logger.error(`获取区块失败: ${error}`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        if (retries >= maxRetries) {
          throw new Error(
            `获取当前区块失败，已达最大重试次数(${maxRetries}): ${error}`
          );
        }
      }
    }
    throw new Error("获取当前区块达到最大重试次数");
  }

  /**
   * 开始扫描区块链
   */
  public async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    // 启动区块轮询
    this.pollingTimer = setInterval(
      () => this.pollNewBlocks(),
      this.pollInterval
    );

    logger.info(`区块链扫描器已启动`);
  }

  /**
   * 停止扫描区块链
   */
  public stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    // 停止队列处理的相关标志
    this.isProcessingQueue = false;

    logger.info(`区块链扫描器已停止`);
  }

  /**
   * 轮询新区块
   */
  private async pollNewBlocks(): Promise<void> {
    try {
      if (!this.running) return;
      const currentBlock =
        await SniperUtils.getInstance().trx.getCurrentBlock();
      if (
        !currentBlock ||
        !currentBlock.block_header ||
        !currentBlock.block_header.raw_data
      ) {
        logger.error(`获取到的区块数据格式无效`);
        return;
      }
      // 获取区块高度
      const currentBlockNumber = currentBlock.block_header.raw_data.number;
      // ✅ 减去一个块，避免处理未确认区块
      const safeBlockNumber = currentBlockNumber - 1;
      if (safeBlockNumber <= this.lastProcessedBlockNumber) {
        return;
      }
      // 处理新区块
      for (
        let blockNum = this.lastProcessedBlockNumber + 1;
        blockNum <= safeBlockNumber;
        blockNum++
      ) {
        await this.processBlock(blockNum);
      }
    } catch (error: unknown) {
      logger.error(
        `轮询区块出错: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * 处理单个区块
   * @param blockNumber 区块高度
   */
  private async processBlock(blockNumber: number): Promise<void> {
    try {
      const block = await this.getBlockWithRetry(blockNumber);
      if (!block || !block.block_header) {
        return;
      }

      // 更新最后处理的区块高度
      this.lastProcessedBlockNumber = blockNumber;

      const { transactions = [] } = block;
      if (transactions.length === 0) return;
      const validTransactions = transactions.filter((tx: any) => {
        const contract = tx.raw_data?.contract?.[0];
        const type = contract?.type;
        const contractAddress = contract?.parameter?.value?.contract_address;
        return type === "TriggerSmartContract" && !!contractAddress?.trim();
      });

      // 如果有有效交易，添加到队列
      if (validTransactions.length > 0) {
        logger.info(
          `区块 #${blockNumber} 发现 ${validTransactions.length} 笔有效交易，添加到处理队列`
        );
        for (const tx of validTransactions) {
          this.addToTransactionQueue(tx);
        }
      }
    } catch (error: unknown) {
      logger.error(
        `处理区块 #${blockNumber} 出错: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * 添加交易到队列
   * @param transaction 交易对象
   */
  private addToTransactionQueue(transaction: any): void {
    // 检查是否已存在队列中，避免重复
    if (!transaction.txID) {
      return;
    }
    if (this.processedTxIDs.has(transaction.txID)) {
      return;
    }
    if (this.transactionQueue.length >= this.maxQueueSize) {
      logger.warn(`交易队列已达到最大容量 ${this.maxQueueSize}，丢弃新交易`);
      return;
    }
    // 添加到队列并记录交易ID
    this.transactionQueue.push(transaction);
    this.processedTxIDs.add(transaction.txID);
    // 定期清理已处理交易ID集合，避免无限增长
    if (this.processedTxIDs.size > this.maxQueueSize * 2) {
      this.cleanupProcessedTxIDs();
    }

    // 当有新交易添加到队列时触发队列处理
    if (
      !this.isProcessingQueue &&
      this.running &&
      this.transactionQueue.length > 0
    ) {
      // 使用setTimeout避免阻塞当前方法，确保是异步触发
      setTimeout(() => this.processTransactionQueue(), 0);
    }
  }

  /**
   * 清理已处理的交易ID集合
   * 仅保留最近的maxQueueSize个交易ID
   */
  private cleanupProcessedTxIDs(): void {
    if (this.processedTxIDs.size <= this.maxQueueSize) {
      return;
    }

    logger.info(`清理已处理交易ID缓存，当前大小: ${this.processedTxIDs.size}`);

    // 转换为数组，只保留最新的maxQueueSize个元素
    const txIDsArray = Array.from(this.processedTxIDs);
    const toKeep = txIDsArray.slice(-this.maxQueueSize);

    // 重置集合
    this.processedTxIDs = new Set(toKeep);

    logger.info(`清理完成，新大小: ${this.processedTxIDs.size}`);
  }

  /**
   * 处理单个交易
   * @param transaction 交易对象
   */
  private async processTransaction(transaction: any): Promise<void> {
    const txID = transaction.txID;
    try {
      await new Promise((resolve) =>
        setTimeout(resolve, this.queueProcessingInterval)
      );
      const txInfo = await SniperUtils.getInstance().trx.getTransaction(txID);
      if (!txInfo) {
        return;
      }
      let contractAddress = null;
      if (
        txInfo &&
        txInfo.raw_data &&
        txInfo.raw_data.contract &&
        Array.isArray(txInfo.raw_data.contract) &&
        txInfo.raw_data.contract.length > 0 &&
        txInfo.raw_data.contract[0].parameter &&
        txInfo.raw_data.contract[0].parameter.value &&
        (txInfo.raw_data.contract[0].parameter.value as any).contract_address &&
        txInfo.raw_data.contract[0].type === "TriggerSmartContract"
      ) {
        // 从交易数据中获取合约地址
        contractAddress = SniperUtils.getAddressFromHex(
          (txInfo.raw_data.contract[0].parameter.value as any).contract_address
        );
      }
      if (!contractAddress) {
        return;
      }

      if (contractAddress === SUNSWAP_NEW_TOKEN) {
        await this.checkTokenCreationInTransaction(txInfo);
      }
    } catch (error: unknown) {
      logger.error(`获取交易信息失败: txID=${txID}, ${error}`);
    }
  }

  /**
   * 在交易中检查是否有新代币创建
   * @param txInfo 交易信息
   */
  private async checkTokenCreationInTransaction(txInfo: any): Promise<void> {
    try {
      if (!txInfo || !txInfo.txID) {
        return;
      }
      const txReceipt = await SniperUtils.getInstance().trx.getTransactionInfo(
        txInfo.txID
      );
      if (!txReceipt || !txReceipt.log || !Array.isArray(txReceipt.log)) {
        return;
      }

      // 遍历日志事件，查找TokenCreate事件
      for (const log of txReceipt.log) {
        // 检查日志是否包含必要的信息
        if (!log.topics || !Array.isArray(log.topics)) {
          continue;
        }
        try {
          // TokenCreate事件的特征
          // 事件签名: 1ff0a01c8968e3551472812164f233abb579247de887db8cbb18281c149bee7a
          const isTokenCreateEvent =
            log.topics[0] ===
            "1ff0a01c8968e3551472812164f233abb579247de887db8cbb18281c149bee7a";
          if (isTokenCreateEvent) {
            const tokenAddress =
              log.data && log.data.length >= 64
                ? SniperUtils.getAddressFromHex("41" + log.data.slice(24, 64))
                : SniperUtils.getAddressFromHex("41" + log.address);

            // 获取创建者地址 (如果在日志中有提供)
            let creatorAddress = "";
            if (log.topics.length > 1 && log.topics[1]) {
              creatorAddress = SniperUtils.getAddressFromHex(
                "41" + log.topics[1].slice(24)
              );
            }

            // 立即获取代币信息并打印
            try {
              const tokenInfo = await this.getTokenInfo(tokenAddress);
              // 打印完整的代币信息
              logger.info("\n" + "=".repeat(80));
              logger.info(`检测到TokenCreate事件!`);
              logger.info(`🪙 代币地址: ${tokenAddress}`);
              if (creatorAddress) {
                logger.info(`👤 创建者地址: ${creatorAddress}`);
              }
              logger.info(`⏰ 创建时间: ${new Date().toLocaleString()}`);
              logger.info(`📝 名称: ${tokenInfo.name}`);
              logger.info(`🔤 符号: ${tokenInfo.symbol}`);
              logger.info(`🔢 精度: ${tokenInfo.decimals}`);
              logger.info(
                `🔗 查看链接: https://tronscan.org/#/token20/${tokenAddress}`
              );
              logger.info("=".repeat(80) + "\n");
              // 通知发现新代币事件
              this.emit("newToken", {
                address: tokenAddress,
                creator: creatorAddress,
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                decimals: tokenInfo.decimals,
                createdAt: new Date(),
              });
            } catch (tokenInfoError) {
              logger.warn(`无法获取代币详细信息: ${tokenInfoError}`);
            }
          }
        } catch (logError) {
          logger.debug(`解析日志事件出错: ${logError}`);
        }
      }
    } catch (error) {
      logger.error(
        `检查代币创建出错: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * 获取代币信息
   * @param tokenAddress 代币地址
   */
  async getTokenInfo(tokenAddress: string): Promise<any> {
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

      try {
        name = await tokenContract.name().call();
      } catch (error) {
        // 忽略错误
      }

      try {
        symbol = await tokenContract.symbol().call();
      } catch (error) {
        // 忽略错误
      }

      try {
        decimals = await tokenContract.decimals().call();
      } catch (error) {
        // 忽略错误
      }

      return { name, symbol, decimals };
    } catch (error) {
      return { name: "未知", symbol: "未知", decimals: 0 };
    }
  }

  /**
   * 处理交易队列
   */
  private async processTransactionQueue(): Promise<void> {
    // 如果已经在处理队列或队列为空，则返回
    if (
      this.isProcessingQueue ||
      this.transactionQueue.length === 0 ||
      !this.running
    ) {
      return;
    }

    // 设置处理标志为真
    this.isProcessingQueue = true;

    try {
      // 处理队列中的所有交易，批量处理提高效率
      const queueLength = this.transactionQueue.length;
      logger.info(`开始处理交易队列，共 ${queueLength} 笔交易`);

      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;

      // 循环处理队列中的交易，直到队列为空或停止运行
      while (this.transactionQueue.length > 0 && this.running) {
        const batchSize = Math.min(20, this.transactionQueue.length);
        const currentBatch = this.transactionQueue.splice(0, batchSize);
        logger.info(
          `批量处理第 ${processedCount + 1}-${
            processedCount + currentBatch.length
          } / ${queueLength} 笔交易，剩余 ${this.transactionQueue.length} 笔`
        );

        // 并行处理交易，但限制并发数量为3，避免请求过多导致API限制
        const concurrencyLimit = 3;
        const results = [];
        // 分组处理
        for (let i = 0; i < currentBatch.length; i += concurrencyLimit) {
          const batch = currentBatch.slice(i, i + concurrencyLimit);
          const promises = batch.map((tx) => this.processTransaction(tx));
          // 等待当前批次完成
          const batchResults = await Promise.allSettled(promises);
          results.push(...batchResults);
          // 更新计数
          const batchSuccess = batchResults.filter(
            (r) => r.status === "fulfilled"
          ).length;
          const batchFailed = batchResults.filter(
            (r) => r.status === "rejected"
          ).length;

          successCount += batchSuccess;
          failedCount += batchFailed;
          if (i + concurrencyLimit < currentBatch.length) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
        processedCount += currentBatch.length;
        // 每处理100个交易输出一次状态
        if (processedCount % 100 === 0 || this.transactionQueue.length === 0) {
          logger.info(
            `已处理: ${processedCount}/${queueLength}, 成功: ${successCount}, 失败: ${failedCount}, 剩余: ${this.transactionQueue.length}`
          );
        }
      }
      // 最终处理结果
      logger.info(
        `队列处理完成: 共处理 ${processedCount} 笔交易, 成功: ${successCount}, 失败: ${failedCount}`
      );
    } catch (error) {
      logger.error(`处理交易队列出错: ${error}`);
    } finally {
      this.isProcessingQueue = false;

      // 检查是否还有剩余交易需要处理，如果有则重新触发处理
      if (this.transactionQueue.length > 0 && this.running) {
        setTimeout(() => this.processTransactionQueue(), 100);
      }
    }
  }

  /**
   * 获取区块数据，带重试机制
   * @param blockNumber 区块高度
   * @returns 区块数据或null
   */
  private async getBlockWithRetry(blockNumber: number): Promise<any> {
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        return await SniperUtils.getInstance().trx.getBlockByNumber(
          blockNumber
        );
      } catch (error: any) {
        retries++;
        const errorMsg = String(error);

        // 处理403限流错误
        if (errorMsg.includes("403")) {
          logger.warn(
            `获取区块数据遇到限流(403)，等待31秒后重试: 区块=#${blockNumber}`
          );
          // 等待31秒，确保超过TronGrid的30秒限流期
          await new Promise((resolve) => setTimeout(resolve, 31000));
          // 切换API Key
          await SniperUtils.refreshInstance();
        }
        // 处理401授权错误
        else if (errorMsg.includes("401")) {
          logger.warn(
            `获取区块数据授权失败(401)，切换API Key: 区块=#${blockNumber}`
          );
          await SniperUtils.refreshInstance();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        // 其他错误
        else {
          logger.error(`获取区块数据失败: 区块=#${blockNumber}, ${error}`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // 达到最大重试次数，放弃此区块处理
        if (retries >= maxRetries) {
          logger.error(
            `获取区块数据失败，已达最大重试次数: 区块=#${blockNumber}`
          );
          return null;
        }
      }
    }

    return null;
  }
}
