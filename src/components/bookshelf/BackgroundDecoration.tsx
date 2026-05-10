"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const alwaysTrue = () => true;
const subscribe = () => () => {};

export function BackgroundDecoration() {
  const mounted = useSyncExternalStore(subscribe, alwaysTrue, () => false);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
      {/* Aurora Ambient Light */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-[0.15] dark:opacity-[0.1]">
        <div 
          className="absolute -left-[10%] -top-[10%] h-[70%] w-[70%] rounded-full bg-primary/10 blur-[120px] dark:bg-primary/5" 
          style={{ animation: "aurora-1 20s ease-in-out infinite" }}
        />
        <div 
          className="absolute -right-[10%] -bottom-[10%] h-[70%] w-[70%] rounded-full bg-cta/10 blur-[120px] dark:bg-cta/5" 
          style={{ animation: "aurora-2 25s ease-in-out infinite" }}
        />
        <div 
          className="absolute left-[20%] top-[20%] h-[60%] w-[60%] rounded-full bg-primary/5 blur-[100px] dark:bg-primary/2" 
          style={{ animation: "aurora-3 30s ease-in-out infinite" }}
        />
      </div>

      {/* Subtle Mesh Gradient Overlay */}
      <div className="absolute inset-0 z-10 opacity-[0.03] dark:opacity-[0.05]" 
        style={{
          backgroundImage: `
            radial-gradient(at 0% 0%, var(--primary) 0, transparent 50%),
            radial-gradient(at 50% 0%, var(--cta) 0, transparent 50%),
            radial-gradient(at 100% 0%, var(--primary) 0, transparent 50%),
            radial-gradient(at 0% 100%, var(--cta) 0, transparent 50%),
            radial-gradient(at 50% 100%, var(--primary) 0, transparent 50%),
            radial-gradient(at 100% 100%, var(--cta) 0, transparent 50%)
          `
        }}
      />

      {/* Refined Grid Pattern */}
      <div className="absolute inset-0 z-20 opacity-[0.015] [background-image:linear-gradient(to_right,var(--foreground)_1px,transparent_1px),linear-gradient(to_bottom,var(--foreground)_1px,transparent_1px)] [background-size:60px_60px]" />

      {/* Noise Texture Layer */}
      <div className="absolute inset-0 z-30 opacity-[0.02] dark:opacity-[0.04] [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')]" />

      {/* Vignette for depth */}
      <div className="absolute inset-0 z-40 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_100%)] opacity-30 dark:opacity-50" />
    </div>
  );
}
