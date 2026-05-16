function getClientAddress(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

export function buildFailedLoginIdentifier(login: string, headers: Headers): string {
  const normalizedLogin = login.trim().toLowerCase();
  const userAgent = headers.get("user-agent")?.trim() || "unknown";

  return `${normalizedLogin}|${getClientAddress(headers)}|${userAgent}`;
}
