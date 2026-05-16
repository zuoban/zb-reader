type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogLevel(): LogLevel {
  const envLevel = process.env.ZB_READER_LOG_LEVEL;
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  return process.env.NODE_ENV === "production" ? "warn" : "info";
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, context: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `${timestamp} [zb-reader] ${level.toUpperCase()} [${context}] ${message}`;
}

interface _LogMeta {
  [key: string]: unknown;
}

export const logger = {
  debug(context: string, message: string, metaOrArgs?: unknown) {
    if (shouldLog("debug")) {
      if (metaOrArgs && typeof metaOrArgs === "object") {
        console.debug(formatMessage("debug", context, message), JSON.stringify(metaOrArgs));
      } else {
        console.debug(formatMessage("debug", context, message), metaOrArgs ?? "");
      }
    }
  },

  info(context: string, message: string, metaOrArgs?: unknown) {
    if (shouldLog("info")) {
      if (metaOrArgs && typeof metaOrArgs === "object") {
        console.info(formatMessage("info", context, message), JSON.stringify(metaOrArgs));
      } else {
        console.info(formatMessage("info", context, message), metaOrArgs ?? "");
      }
    }
  },

  warn(context: string, message: string, ...args: unknown[]) {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", context, message), ...args);
    }
  },

  error(context: string, message: string, ...args: unknown[]) {
    if (shouldLog("error")) {
      console.error(formatMessage("error", context, message), ...args);
    }
  },
};;
