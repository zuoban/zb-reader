import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// We need to mock dns/promises before the module imports it.
// vi.mock is hoisted, so we define the mock at module level using vi.hoisted.
const lookupMock = vi.fn();

vi.mock("dns/promises", () => ({
  lookup: lookupMock,
  default: { lookup: lookupMock },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("assertSafeServerFetchUrl", () => {
  // Dynamic import so the mock is applied before the module loads
  it("rejects non-http protocols", async () => {
    const { assertSafeServerFetchUrl } = await import("./server-url-safety");
    await expect(assertSafeServerFetchUrl("file:///etc/passwd")).rejects.toThrow(
      "仅支持 HTTP/HTTPS 地址"
    );
  });

  it("rejects credentials in URLs", async () => {
    const { assertSafeServerFetchUrl } = await import("./server-url-safety");
    await expect(
      assertSafeServerFetchUrl("https://user:pass@example.com/tts")
    ).rejects.toThrow("URL不能包含用户名或密码");
  });

  it("rejects localhost and private IP addresses", async () => {
    const { assertSafeServerFetchUrl } = await import("./server-url-safety");
    await expect(assertSafeServerFetchUrl("http://127.0.0.1:8080/tts")).rejects.toThrow(
      "不允许请求内网或本机地址"
    );
    await expect(assertSafeServerFetchUrl("http://192.168.1.2/tts")).rejects.toThrow(
      "不允许请求内网或本机地址"
    );
  });

  it("allows public HTTP and HTTPS IP addresses", async () => {
    const { assertSafeServerFetchUrl } = await import("./server-url-safety");
    await expect(assertSafeServerFetchUrl("https://1.1.1.1/tts")).resolves.toBeInstanceOf(URL);
    await expect(assertSafeServerFetchUrl("http://8.8.8.8/tts")).resolves.toBeInstanceOf(URL);
  });

  it("rejects hostname that resolves to private IP", async () => {
    lookupMock.mockResolvedValue([{ address: "10.0.0.1", family: 4 }]);
    const { assertSafeServerFetchUrl } = await import("./server-url-safety");

    await expect(
      assertSafeServerFetchUrl("https://evil.example.com/tts")
    ).rejects.toThrow("不允许请求内网或本机地址");
  });

  it("allows hostname that resolves to public IPs only", async () => {
    lookupMock.mockResolvedValue([
      { address: "1.1.1.1", family: 4 },
      { address: "8.8.8.8", family: 4 },
    ]);
    const { assertSafeServerFetchUrl } = await import("./server-url-safety");

    const result = await assertSafeServerFetchUrl("https://good.example.com/tts");
    expect(result).toBeInstanceOf(URL);
  });

  it("rejects if any resolved address is private (mixed result)", async () => {
    lookupMock.mockResolvedValue([
      { address: "1.1.1.1", family: 4 },
      { address: "192.168.1.1", family: 4 },
    ]);
    const { assertSafeServerFetchUrl } = await import("./server-url-safety");

    await expect(
      assertSafeServerFetchUrl("https://mixed.example.com/tts")
    ).rejects.toThrow("不允许请求内网或本机地址");
  });

  it("rejects empty DNS results", async () => {
    lookupMock.mockResolvedValue([]);
    const { assertSafeServerFetchUrl } = await import("./server-url-safety");

    await expect(
      assertSafeServerFetchUrl("https://empty.example.com/tts")
    ).rejects.toThrow("不允许请求内网或本机地址");
  });

  it("allows private URLs when ZB_READER_ALLOW_PRIVATE_TTS_URLS is true", async () => {
    const origEnv = process.env.ZB_READER_ALLOW_PRIVATE_TTS_URLS;
    process.env.ZB_READER_ALLOW_PRIVATE_TTS_URLS = "true";
    vi.resetModules();
    // Re-register mock after reset
    vi.doMock("dns/promises", () => ({
      lookup: lookupMock,
      default: { lookup: lookupMock },
    }));
    const { assertSafeServerFetchUrl } = await import("./server-url-safety");

    await expect(
      assertSafeServerFetchUrl("http://192.168.1.100/tts")
    ).resolves.toBeInstanceOf(URL);

    if (origEnv === undefined) {
      delete process.env.ZB_READER_ALLOW_PRIVATE_TTS_URLS;
    } else {
      process.env.ZB_READER_ALLOW_PRIVATE_TTS_URLS = origEnv;
    }
    vi.doUnmock("dns/promises");
  });
});
