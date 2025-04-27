/**
 * API Key 管理工具
 * 简单的随机API Key获取器
 */
class ApiKeyManager {
  private static apiKeys: string[] = [];
  private static isInitialized: boolean = false;

  /**
   * 初始化 API Key 管理器
   */
  private static initialize(): void {
    if (this.isInitialized) return;
    const apiKeysString = process.env.API_KEYS || "";
    this.apiKeys = apiKeysString
      .split(",")
      .map((key) => key.trim())
      .filter((key) => key.length > 0);

    if (this.apiKeys.length === 0) {
      console.warn("没有设置API Keys，将使用空字符串");
      this.apiKeys = [""];
    }

    this.isInitialized = true;
  }

  /**
   * 获取随机 API Key
   * @returns 随机选择的 API Key
   */
  static getRandomApiKey(): string {
    this.initialize();
    const randomIndex = Math.floor(Math.random() * this.apiKeys.length);
    return this.apiKeys[randomIndex];
  }

  /**
   * 保留这些方法只是为了兼容现有代码，都使用相同的随机逻辑
   */
  static getNextApiKey = ApiKeyManager.getRandomApiKey;
  static getCurrentApiKey = ApiKeyManager.getRandomApiKey;
}

export default ApiKeyManager;
