import { createHmac } from "crypto";

const SECRET_KEY = "zb-reader-progress-token-secret-v1";

export interface ProgressTokenPayload {
  userId: string;
  bookId: string;
  timestamp: string;
}

export function generateToken(payload: ProgressTokenPayload): string {
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr).toString("base64");
  const signature = createHmac("sha256", SECRET_KEY)
    .update(payloadStr)
    .digest("hex");
  return `${payloadBase64}.${signature}`;
}

export function verifyToken(token: string): ProgressTokenPayload | null {
  try {
    const [payloadBase64, signature] = token.split(".");
    const payloadStr = Buffer.from(payloadBase64, "base64").toString("utf-8");
    const expectedSignature = createHmac("sha256", SECRET_KEY)
      .update(payloadStr)
      .digest("hex");
    
    if (signature !== expectedSignature) return null;
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

export function isTokenNewer(token: string, dbTimestamp: string): boolean {
  const payload = verifyToken(token);
  if (!payload) return false;
  const tokenDate = new Date(payload.timestamp).getTime();
  const dbDate = new Date(dbTimestamp).getTime();
  const tolerance = 1000;
  return tokenDate > dbDate - tolerance;
}
