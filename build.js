const { build } = require("esbuild");
const esbuildPluginPino = require("esbuild-plugin-pino");
const fs = require("fs");

// 确保目录存在
if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist");
}
if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

// 执行构建
build({
  entryPoints: ["src/index.ts"],
  outdir: "dist",
  bundle: true,
  platform: "node",
  minify: true,
  sourcemap: true,
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
})
  .then(() => {
    console.log("✅ 构建成功");
  })
  .catch((err) => {
    console.error("❌ 构建失败:", err);
    process.exit(1);
  });
