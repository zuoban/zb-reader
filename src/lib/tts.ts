export interface TtsConfigApiItem {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: unknown;
  body: unknown;
  contentType: string | null;
  concurrentRate: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrowserVoiceOption {
  id: string;
  name: string;
  lang: string;
}

export interface ParsedLegadoSpeechResult {
  text: string;
  audioUrl: string | null;
}

interface ParsedReaderHeader {
  [key: string]: string;
}

function parseReaderHeader(rawHeader: string): ParsedReaderHeader {
  const lines = rawHeader
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const headers: ParsedReaderHeader = {};
  lines.forEach((line) => {
    const index = line.indexOf(":");
    if (index <= 0) return;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!key || !value) return;
    headers[key] = value;
  });
  return headers;
}

export function resolveConfigHeaders(
  config: TtsConfigApiItem
): Record<string, string> {
  const headerObj =
    config.headers && typeof config.headers === "object"
      ? (config.headers as Record<string, unknown>)
      : {};

  const rawHeader = typeof headerObj.header === "string" ? headerObj.header : "";
  const parsedHeader = rawHeader ? parseReaderHeader(rawHeader) : {};

  const result: Record<string, string> = {
    ...parsedHeader,
  };

  Object.entries(headerObj).forEach(([key, value]) => {
    if (typeof value === "string") {
      result[key] = value;
    }
  });

  return result;
}

export function parseLegadoSpeechText(rawResponse: string): string {
  const text = rawResponse.trim();
  if (!text) return "";

  const jsonLike = text.startsWith("{") || text.startsWith("[");
  if (!jsonLike) {
    return text;
  }

  try {
    const data = JSON.parse(text) as unknown;

    if (typeof data === "string") {
      return data;
    }

    if (Array.isArray(data)) {
      const joined = data
        .map((item) => (typeof item === "string" ? item : ""))
        .filter(Boolean)
        .join(" ");
      return joined || text;
    }

    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const candidates = [
        "content",
        "data",
        "text",
        "speech",
        "msg",
        "message",
        "result",
        "answer",
      ];
      for (const key of candidates) {
        const value = obj[key];
        if (typeof value === "string" && value.trim()) {
          return value;
        }
      }
    }

    return text;
  } catch {
    return text;
  }
}

function evaluateArithmeticExpression(
  expression: string,
  speakSpeed: number
): string {
  const replaced = expression.replace(/\bspeakSpeed\b/g, String(speakSpeed));
  if (!/^[0-9+\-*/().\s]+$/.test(replaced)) {
    return expression;
  }

  try {
    const value = Function(`"use strict"; return (${replaced});`)() as number;
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    return expression;
  } catch {
    return expression;
  }
}

function evaluateLegadoExpression(
  expression: string,
  text: string,
  speakSpeed: number
): string {
  const trimmed = expression.trim();

  if (trimmed === "speakText" || trimmed === "text") {
    return text;
  }

  if (trimmed === "speakSpeed") {
    return String(speakSpeed);
  }

  if (trimmed.startsWith("java.encodeURI(") && trimmed.endsWith(")")) {
    const inner = trimmed.slice("java.encodeURI(".length, -1);
    const value = evaluateLegadoExpression(inner, text, speakSpeed);
    return encodeURIComponent(value);
  }

  if (/[+\-*/()]/.test(trimmed) || trimmed.includes("speakSpeed")) {
    return evaluateArithmeticExpression(trimmed, speakSpeed);
  }

  return trimmed;
}

export function fillLegadoTemplate(
  input: string,
  text: string,
  speakSpeed: number
): string {
  const replacedByExpression = input.replace(/\{\{\s*([^{}]+)\s*\}\}/g, (_, expr) =>
    evaluateLegadoExpression(expr, text, speakSpeed)
  );

  const encoded = encodeURIComponent(text);
  return replacedByExpression
    .replaceAll("{speakText}", encoded)
    .replaceAll("{text}", encoded)
    .replaceAll("${speakText}", text)
    .replaceAll("${text}", text)
    .replaceAll("${speakSpeed}", String(speakSpeed));
}

export function buildLegadoRequestBody(
  config: TtsConfigApiItem,
  selectedText: string,
  speakSpeed: number
): BodyInit | undefined {
  const data =
    config.body && typeof config.body === "object"
      ? { ...(config.body as Record<string, unknown>) }
      : {};

  data.text = selectedText;
  data.speakSpeed = speakSpeed;

  const headers = resolveConfigHeaders(config);
  const contentType = config.contentType || headers["Content-Type"] || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const resolved =
        typeof value === "string"
          ? fillLegadoTemplate(value, selectedText, speakSpeed)
          : String(value);
      params.set(key, resolved);
    });
    return params;
  }

  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === "string") {
      data[key] = fillLegadoTemplate(value, selectedText, speakSpeed);
    }
  });

  return JSON.stringify(data);
}

export function resolveLegadoRequestUrl(
  url: string,
  text: string,
  speakSpeed: number
): string {
  const resolved = fillLegadoTemplate(url, text, speakSpeed);
  if (resolved !== url) {
    return resolved;
  }

  try {
    const parsed = new URL(resolved);
    if (!parsed.searchParams.has("speakText") && !parsed.searchParams.has("text")) {
      parsed.searchParams.set("speakText", text);
    }
    return parsed.toString();
  } catch {
    const separator = resolved.includes("?") ? "&" : "?";
    return `${resolved}${separator}speakText=${encodeURIComponent(text)}`;
  }
}

export function parseLegadoSpeechResult(rawResponse: string): ParsedLegadoSpeechResult {
  const trimmed = rawResponse.trim();
  if (!trimmed) {
    return { text: "", audioUrl: null };
  }

  const isAudioUrl = /^https?:\/\/.+\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(trimmed);
  if (isAudioUrl) {
    return { text: "", audioUrl: trimmed };
  }

  const jsonLike = trimmed.startsWith("{") || trimmed.startsWith("[");
  if (!jsonLike) {
    return { text: trimmed, audioUrl: null };
  }

  try {
    const data = JSON.parse(trimmed) as unknown;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      const audioKeys = ["audio", "audioUrl", "url", "src"];
      for (const key of audioKeys) {
        const value = obj[key];
        if (typeof value === "string" && /^https?:\/\//.test(value)) {
          return { text: "", audioUrl: value };
        }
      }
    }
  } catch {
    // ignore parse error and fallback below
  }

  return { text: parseLegadoSpeechText(trimmed), audioUrl: null };
}
