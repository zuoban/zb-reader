import { isIP } from "net";
import { lookup } from "dns/promises";

const PRIVATE_TTS_URLS_ALLOWED =
  process.env.ZB_READER_ALLOW_PRIVATE_TTS_URLS === "true";

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIpv6(ip: string) {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function isPrivateAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

export async function assertSafeServerFetchUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("URL格式不正确");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("仅支持 HTTP/HTTPS 地址");
  }

  if (parsed.username || parsed.password) {
    throw new Error("URL不能包含用户名或密码");
  }

  if (PRIVATE_TTS_URLS_ALLOWED) {
    return parsed;
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error("不允许请求内网或本机地址");
    }
    return parsed;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((item) => isPrivateAddress(item.address))) {
    throw new Error("不允许请求内网或本机地址");
  }

  return parsed;
}

export function createServerFetchSignal(timeoutMs = 15000) {
  return AbortSignal.timeout(timeoutMs);
}
