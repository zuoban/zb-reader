"use client";

import { useEffect, useState } from "react";

export function BackgroundDecoration() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Paper Texture Base - Light Mode */}
      <div className="absolute inset-0 bg-[#f8f6f3] dark:bg-[#161513]" />

      {/* Subtle Paper Grain Texture */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Warm Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 via-transparent to-stone-100/50 dark:from-amber-950/15 dark:via-transparent dark:to-stone-950/20" />

      {/* Soft Vignette - Creates depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_50%,rgba(0,0,0,0.02)_100%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_40%,rgba(0,0,0,0.3)_100%)]" />

      {/* Horizontal Paper Lines - Subtle ruling lines effect */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="ruling-lines" x="0" y="0" width="100%" height="28" patternUnits="userSpaceOnUse">
              <line x1="0" y1="27" x2="100%" y2="27" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ruling-lines)" />
        </svg>
      </div>

      {/* Soft Light Leak - Top Right */}
      <div
        className="absolute -right-[20%] -top-[20%] h-[80%] w-[80%] rounded-full bg-gradient-to-br from-amber-200/20 via-orange-100/10 to-transparent blur-[100px] dark:from-amber-900/10 dark:via-stone-800/5 dark:to-transparent"
        style={mounted ? { animation: "paper-glow 20s ease-in-out infinite" } : undefined}
      />

      {/* Soft Light Leak - Bottom Left */}
      <div
        className="absolute -left-[15%] -bottom-[15%] h-[70%] w-[70%] rounded-full bg-gradient-to-tr from-stone-200/25 via-amber-100/10 to-transparent blur-[90px] dark:from-stone-800/12 dark:via-amber-950/5 dark:to-transparent"
        style={mounted ? { animation: "paper-glow 25s ease-in-out infinite reverse" } : undefined}
      />

      {/* Subtle Corner Accents */}
      <div className="absolute right-8 top-8 h-32 w-32 opacity-[0.04] dark:opacity-[0.03]">
        <svg viewBox="0 0 100 100" className="h-full w-full text-amber-800 dark:text-amber-700">
          <circle cx="80" cy="20" r="1.5" fill="currentColor" />
          <circle cx="85" cy="25" r="1" fill="currentColor" />
          <circle cx="75" cy="28" r="0.8" fill="currentColor" />
        </svg>
      </div>

      <div className="absolute bottom-8 left-8 h-24 w-24 opacity-[0.03] dark:opacity-[0.02]">
        <svg viewBox="0 0 100 100" className="h-full w-full text-stone-600 dark:text-stone-500">
          <circle cx="20" cy="80" r="1.2" fill="currentColor" />
          <circle cx="28" cy="75" r="0.9" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
