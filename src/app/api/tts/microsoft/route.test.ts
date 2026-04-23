import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
const mockSynthesizeMicrosoftSpeech = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/microsoftTts", () => ({
  synthesizeMicrosoftSpeech: (...args: unknown[]) => mockSynthesizeMicrosoftSpeech(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("normalizeMicrosoftSpeakPayload", () => {
  it("trims values and normalizes synthesis numbers", async () => {
    const { normalizeMicrosoftSpeakPayload } = await import("./route");

    expect(
      normalizeMicrosoftSpeakPayload({
        text: " 你好 ",
        voiceName: "  zh-CN-XiaoxiaoMultilingualNeural  ",
        rate: "1.8",
        pitch: "-120",
        volume: "120",
        outputFormat: " audio/mpeg ",
        prefetch: "1",
      })
    ).toEqual({
      text: "你好",
      voiceName: "zh-CN-XiaoxiaoMultilingualNeural",
      rate: 2,
      pitch: -100,
      volume: 100,
      outputFormat: "audio/mpeg",
      prefetch: true,
    });
  });

  it("falls back to defaults for invalid values", async () => {
    const { normalizeMicrosoftSpeakPayload } = await import("./route");

    expect(
      normalizeMicrosoftSpeakPayload({
        text: "",
        voiceName: "   ",
        rate: "abc",
        pitch: undefined,
        volume: Number.NaN,
        prefetch: "false",
      })
    ).toEqual({
      text: "",
      voiceName: "zh-CN-XiaoxiaoMultilingualNeural",
      rate: 0,
      pitch: 0,
      volume: 50,
      outputFormat: undefined,
      prefetch: false,
    });
  });
});

describe("Microsoft TTS API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", username: "test", email: "test@test.com" },
      expires: new Date().toISOString(),
    });
    mockSynthesizeMicrosoftSpeech.mockResolvedValue(
      new Response(Buffer.from("audio"), {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      })
    );
  });

  it("normalizes GET query parameters before calling the synthesizer", async () => {
    const { GET } = await import("./route");

    const res = await GET(
      createRequest(
        "/api/tts/microsoft?text=%E4%BD%A0%E5%A5%BD&voiceName=%20custom%20&rate=1.8&pitch=-120&volume=120&prefetch=true"
      )
    );

    expect(res.status).toBe(204);
    expect(mockSynthesizeMicrosoftSpeech).toHaveBeenCalledWith({
      text: "你好",
      voiceName: "custom",
      rate: 2,
      pitch: -100,
      volume: 100,
      outputFormat: undefined,
    });
  });
});
