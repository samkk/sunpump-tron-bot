import pino from "pino";

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

export const logger = pino(
  {
    level: "trace",
    redact: ["poolKeys"],
    serializers: {
      error: pino.stdSerializers.err,
    },
    base: undefined,
  },
  transport
);

export default logger;
