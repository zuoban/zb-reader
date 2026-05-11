import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/api-utils";
import { synthesizeMicrosoftSpeech } from "@/lib/microsoftTts";

vi.mock("@/lib/api-utils", () => ({
  getAuthUserId: vi.fn(),
}));

vi.mock("@/lib/microsoftTts", () => ({
  synthesizeMicrosoftSpeech: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("/api/tts/builtin/prepare", "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function createGetRequest(key: string): NextRequest {
  return new NextRequest(
    new URL(`/api/tts/builtin/audio/${key}`, "http://localhost:3000")
  );
}

describe("builtin TTS API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUserId).mockResolvedValue({ userId: "user-1" });
    vi.mocked(synthesizeMicrosoftSpeech).mockResolvedValue(
      new Response(Buffer.from("audio"), {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      })
    );
  });

  it("prepares audio and returns a short audio URL", async () => {
    const { POST } = await import("./prepare/route");

    const res = await POST(
      createPostRequest({
        text: "你好",
        voiceName: " zh-CN-XiaoxiaoMultilingualNeural ",
        rate: 25,
        pitch: 0,
        volume: 100,
      })
    );
    const data = (await res.json()) as { audioUrl: string };

    expect(res.status).toBe(200);
    expect(data.audioUrl).toMatch(/^\/api\/tts\/builtin\/audio\/[A-Za-z0-9_-]{43}$/);
    expect(synthesizeMicrosoftSpeech).toHaveBeenCalledWith({
      text: "你好",
      voiceName: "zh-CN-XiaoxiaoMultilingualNeural",
      rate: 25,
      pitch: 0,
      volume: 100,
      outputFormat: undefined,
    });
  });

  it("serves prepared audio by cache key", async () => {
    const { POST } = await import("./prepare/route");
    const { GET } = await import("./audio/[key]/route");

    const prepareRes = await POST(createPostRequest({ text: "缓存音频" }));
    const { audioUrl } = (await prepareRes.json()) as { audioUrl: string };
    const key = audioUrl.split("/").pop()!;

    const audioRes = await GET(createGetRequest(key), { params: Promise.resolve({ key }) });

    expect(audioRes.status).toBe(200);
    expect(audioRes.headers.get("content-type")).toBe("audio/mpeg");
    expect(await audioRes.text()).toBe("audio");
  });

  it("rejects invalid audio cache keys", async () => {
    const { GET } = await import("./audio/[key]/route");

    const res = await GET(createGetRequest("bad-key"), {
      params: Promise.resolve({ key: "bad-key" }),
    });
    const data = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(data.error).toBe("音频缓存 key 无效");
  });

  it("returns 404 for missing cache keys", async () => {
    const { GET } = await import("./audio/[key]/route");
    const key = "a".repeat(43);

    const res = await GET(createGetRequest(key), {
      params: Promise.resolve({ key }),
    });
    const data = (await res.json()) as { error: string };

    expect(res.status).toBe(404);
    expect(data.error).toBe("音频缓存已过期");
  });

  it("maps synthesizer failures to a 502 response", async () => {
    vi.mocked(synthesizeMicrosoftSpeech).mockResolvedValueOnce(
      new Response("upstream failed", { status: 503 })
    );
    const { POST } = await import("./prepare/route");

    const res = await POST(createPostRequest({ text: "失败" }));
    const data = (await res.json()) as { error: string; details: string };

    expect(res.status).toBe(502);
    expect(data.error).toBe("内置TTS请求失败(503)");
    expect(data.details).toBe("upstream failed");
  });
});
