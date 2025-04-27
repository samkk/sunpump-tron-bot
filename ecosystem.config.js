module.exports = {
  apps: [
    {
      name: "pump-bot",
      script: "dist/bundle.js",
      cwd: "./",
      args: "",
      interpreter: "",
      interpreter_args: "",
      watch: false,
      exec_mode: "fork",
      node_args: "--enable-source-maps",
      instances: 1,
      max_memory_restart: "1G",
      error_file: "./logs/app-err.log",
      out_file: "./logs/app-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      min_uptime: "60s",
      max_restarts: 1,
      autorestart: true,
      cron_restart: "",
      restart_delay: 60 * 1000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
