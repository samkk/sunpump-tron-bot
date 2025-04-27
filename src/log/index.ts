import fs from "fs";
import pino from "pino";

// 创建基础日志器配置
const loggerConfig = {
  level: "trace",
  redact: ["poolKeys"],
  serializers: {
    error: pino.stdSerializers.err,
  },
  base: undefined,
};

// 创建文件流
const logStream = fs.createWriteStream("./logs/tron-sniper.log", {
  flags: "a",
});

// 根据环境决定是否使用pretty打印
let logger: pino.Logger;
try {
  // 尝试使用transport
  const transport = pino.transport({
    targets: [
      {
        level: "trace",
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    ],
  });
  logger = pino(loggerConfig, transport);
} catch (error) {
  // 如果transport失败，使用基本配置
  console.warn("无法使用pino-pretty，切换到标准日志输出");
  logger = pino(loggerConfig);
  // 同时输出到文件
  logger = pino(
    loggerConfig,
    pino.multistream([{ stream: process.stdout }, { stream: logStream }])
  );
}

export default logger;
