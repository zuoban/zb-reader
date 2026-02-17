import { createHmac, randomUUID } from "crypto";

interface EndpointTokenResponse {
  r?: string;
  t?: string;
}

export interface MicrosoftVoiceOption {
  id: string;
  name: string;
  lang: string;
}

interface RawMicrosoftVoiceItem {
  ShortName?: string;
  LocalName?: string;
  DisplayName?: string;
  Locale?: string;
}

interface CachedEndpoint {
  token: string;
  region: string;
  expiresAt: number;
}

const ENDPOINT_URL =
  "https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0";
const VOICES_URL =
  "https://eastus.api.speech.microsoft.com/cognitiveservices/voices/list";
const SIGN_SECRET_BASE64 =
  "oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==";
const VOICE_CACHE_DURATION = 4 * 60 * 60 * 1000;

let endpointCache: CachedEndpoint | null = null;
let voiceCache: { data: MicrosoftVoiceOption[]; updatedAt: number } | null = null;

function uuid(): string {
  return randomUUID().replaceAll("-", "");
}

function dateFormat(): string {
  return new Date().toUTCString().replace("GMT", "").trim().toLowerCase() + "GMT";
}

function generateUserId(): string {
  const chars = "abcdef0123456789";
  let result = "";
  for (let i = 0; i < 16; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function signEndpointRequest(url: string): { signature: string; traceId: string } {
  const urlWithoutProtocol = url.split("://")[1] || url;
  const encodedUrl = encodeURIComponent(urlWithoutProtocol);
  const traceId = uuid();
  const formattedDate = dateFormat();
  const bytesToSign =
    `MSTranslatorAndroidApp${encodedUrl}${formattedDate}${traceId}`.toLowerCase();

  const secret = Buffer.from(SIGN_SECRET_BASE64, "base64");
  const digest = createHmac("sha256", secret).update(bytesToSign).digest("base64");

  return {
    signature: `MSTranslatorAndroidApp::${digest}::${formattedDate}::${traceId}`,
    traceId,
  };
}

function decodeJwtExp(token: string): number {
  const payload = token.split(".")[1];
  if (!payload) {
    throw new Error("无效的 endpoint token");
  }
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
    exp?: number;
  };
  if (!decoded.exp || !Number.isFinite(decoded.exp)) {
    throw new Error("endpoint token 缺少过期时间");
  }
  return decoded.exp;
}

async function fetchEndpointToken(forceRefresh = false): Promise<CachedEndpoint> {
  const nowSeconds = Date.now() / 1000;
  if (
    !forceRefresh &&
    endpointCache &&
    nowSeconds < endpointCache.expiresAt - 300
  ) {
    return endpointCache;
  }

  const { signature, traceId } = signEndpointRequest(ENDPOINT_URL);
  const response = await fetch(ENDPOINT_URL, {
    method: "POST",
    headers: {
      "Accept-Language": "zh-Hans",
      "X-ClientVersion": "4.0.530a 5fe1dc6c",
      "X-UserId": generateUserId(),
      "X-HomeGeographicRegion": "zh-Hans-CN",
      "X-ClientTraceId": traceId,
      "X-MT-Signature": signature,
      "User-Agent": "okhttp/4.5.0",
      "Content-Type": "application/json",
      "Content-Length": "0",
      "Accept-Encoding": "gzip",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`获取 endpoint 失败(${response.status}): ${details.slice(0, 200)}`);
  }

  const data = (await response.json()) as EndpointTokenResponse;
  if (!data.r || !data.t) {
    throw new Error("endpoint 返回数据不完整");
  }

  endpointCache = {
    token: data.t,
    region: data.r,
    expiresAt: decodeJwtExp(data.t),
  };
  return endpointCache;
}

function escapeXml(input: string): string {
  return input.replace(/[<>&'\"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}

function buildSsml(params: {
  text: string;
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
}): string {
  const rate = Math.max(-100, Math.min(100, Math.round(params.rate)));
  const pitch = Math.max(-100, Math.min(100, Math.round(params.pitch)));
  const volume = Math.max(0, Math.min(100, Math.round(params.volume)));
  const safeText = escapeXml(params.text);

  return `<speak xmlns=\"http://www.w3.org/2001/10/synthesis\" xmlns:mstts=\"http://www.w3.org/2001/mstts\" version=\"1.0\" xml:lang=\"zh-CN\"><voice name=\"${params.voiceName}\"><mstts:express-as style=\"general\" styledegree=\"1.0\" role=\"default\"><prosody rate=\"${rate}%\" pitch=\"${pitch}%\" volume=\"${volume}\">${safeText}</prosody></mstts:express-as></voice></speak>`;
}

export async function synthesizeMicrosoftSpeech(params: {
  text: string;
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
  outputFormat?: string;
}): Promise<Response> {
  const outputFormat =
    params.outputFormat || "audio-24khz-48kbitrate-mono-mp3";
  const ssml = buildSsml(params);

  const attempt = async (forceRefreshToken: boolean) => {
    const endpoint = await fetchEndpointToken(forceRefreshToken);
    return fetch(
      `https://${endpoint.region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          Authorization: endpoint.token,
          "Content-Type": "application/ssml+xml",
          "User-Agent": "okhttp/4.5.0",
          "X-Microsoft-OutputFormat": outputFormat,
        },
        body: ssml,
      }
    );
  };

  let response = await attempt(false);
  if (response.ok) {
    return response;
  }

  if ([400, 401, 403].includes(response.status)) {
    response = await attempt(true);
  }

  return response;
}

export async function listMicrosoftVoices(): Promise<MicrosoftVoiceOption[]> {
  if (
    voiceCache &&
    Date.now() - voiceCache.updatedAt < VOICE_CACHE_DURATION
  ) {
    return voiceCache.data;
  }

  const response = await fetch(VOICES_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.26",
      "X-Ms-Useragent": "SpeechStudio/2021.05.001",
      "Content-Type": "application/json",
      Origin: "https://azure.microsoft.com",
      Referer: "https://azure.microsoft.com",
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`获取语音列表失败(${response.status}): ${details.slice(0, 200)}`);
  }

  const data = (await response.json()) as RawMicrosoftVoiceItem[];
  const mapped = data
    .map((voice) => ({
      id: voice.ShortName || "",
      name: voice.LocalName || voice.DisplayName || voice.ShortName || "",
      lang: voice.Locale || "",
    }))
    .filter((voice) => voice.id && voice.name)
    .sort((a, b) => {
      const aZh = a.lang.startsWith("zh");
      const bZh = b.lang.startsWith("zh");
      if (aZh !== bZh) return aZh ? -1 : 1;
      return a.name.localeCompare(b.name, "zh-CN");
    });

  voiceCache = {
    data: mapped,
    updatedAt: Date.now(),
  };

  return mapped;
}
