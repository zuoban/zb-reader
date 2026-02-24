type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_PREFIX = "[zb-reader]";

function formatMessage(level: LogLevel, context: string): string {
  return `${LOG_PREFIX} ${level.toUpperCase()} [${context}]`;
}

function shouldLog(level: LogLevel): boolean {
  if (process.env.NODE_ENV === "production") {
    return level === "error";
  }
  return true;
}

export const logger = {
  debug(context: string, message: string, ...args: unknown[]) {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", context), message, ...args);
    }
  },

  info(context: string, message: string, ...args: unknown[]) {
    if (shouldLog("info")) {
      console.info(formatMessage("info", context), message, ...args);
    }
  },

  warn(context: string, message: string, ...args: unknown[]) {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", context), message, ...args);
    }
  },

  error(context: string, message: string, ...args: unknown[]) {
    if (shouldLog("error")) {
      console.error(formatMessage("error", context), message, ...args);
    }
  },
};
