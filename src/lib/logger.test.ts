import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Logger", () => {
  let consoleDebug: ReturnType<typeof vi.spyOn>;
  let consoleInfo: ReturnType<typeof vi.spyOn>;
  let consoleWarn: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    consoleDebug = vi.spyOn(console, "debug").mockImplementation(() => {});
    consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("in development mode", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("should log debug messages", async () => {
      const { logger } = await import("./logger");
      logger.debug("test-context", "test message", { extra: "data" });

      expect(consoleDebug).toHaveBeenCalledWith(
        "[zb-reader] DEBUG [test-context]",
        "test message",
        { extra: "data" }
      );
    });

    it("should log info messages", async () => {
      const { logger } = await import("./logger");
      logger.info("test-context", "info message");

      expect(consoleInfo).toHaveBeenCalledWith(
        "[zb-reader] INFO [test-context]",
        "info message"
      );
    });

    it("should log warn messages", async () => {
      const { logger } = await import("./logger");
      logger.warn("test-context", "warning message");

      expect(consoleWarn).toHaveBeenCalledWith(
        "[zb-reader] WARN [test-context]",
        "warning message"
      );
    });

    it("should log error messages", async () => {
      const { logger } = await import("./logger");
      const error = new Error("test error");
      logger.error("test-context", "error occurred", error);

      expect(consoleError).toHaveBeenCalledWith(
        "[zb-reader] ERROR [test-context]",
        "error occurred",
        error
      );
    });
  });

  describe("in production mode", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });

    it("should NOT log debug messages in production", async () => {
      const { logger } = await import("./logger");
      logger.debug("test-context", "debug message");

      expect(consoleDebug).not.toHaveBeenCalled();
    });

    it("should NOT log info messages in production", async () => {
      const { logger } = await import("./logger");
      logger.info("test-context", "info message");

      expect(consoleInfo).not.toHaveBeenCalled();
    });

    it("should log warn messages in production", async () => {
      const { logger } = await import("./logger");
      logger.warn("test-context", "warning message");

      expect(consoleWarn).toHaveBeenCalledWith(
        "[zb-reader] WARN [test-context]",
        "warning message"
      );
    });

    it("should STILL log error messages in production", async () => {
      const { logger } = await import("./logger");
      logger.error("test-context", "error message");

      expect(consoleError).toHaveBeenCalledWith(
        "[zb-reader] ERROR [test-context]",
        "error message"
      );
    });
  });

  describe("formatMessage", () => {
    it("should format messages with correct prefix and level", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const { logger } = await import("./logger");

      logger.info("my-context", "test");

      expect(consoleInfo).toHaveBeenCalledWith(
        expect.stringContaining("[zb-reader]"),
        expect.anything()
      );
      expect(consoleInfo).toHaveBeenCalledWith(
        expect.stringContaining("INFO"),
        expect.anything()
      );
      expect(consoleInfo).toHaveBeenCalledWith(
        expect.stringContaining("[my-context]"),
        expect.anything()
      );
    });
  });

  describe("with multiple arguments", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("should pass through all arguments", async () => {
      const { logger } = await import("./logger");
      const obj = { key: "value" };
      const arr = [1, 2, 3];

      logger.debug("context", "message", obj, arr, "string", 123);

      expect(consoleDebug).toHaveBeenCalledWith(
        expect.any(String),
        "message",
        obj,
        arr,
        "string",
        123
      );
    });
  });
});
