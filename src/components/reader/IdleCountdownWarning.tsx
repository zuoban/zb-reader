"use client";

interface IdleCountdownWarningProps {
  seconds: number | null;
}

export function IdleCountdownWarning({ seconds }: IdleCountdownWarningProps) {
  if (seconds === null || seconds <= 0) {
    return null;
  }

  return (
    <div
      className="reader-liquid-surface fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2"
      style={{
        color: "var(--reader-text)",
      }}
    >
      <span className="text-sm">即将返回书架 ({seconds}秒)</span>
    </div>
  );
}
