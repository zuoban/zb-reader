"use client";

import { useMemo, useState, useEffect } from "react";

interface Particle {
  id: number;
  left: string;
  top: string;
  size: string;
  duration: string;
  delay: string;
  opacity: number;
  blur: string;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: `${Math.random() * 6 + 3}px`,
    duration: `${Math.random() * 35 + 25}s`,
    delay: `-${Math.random() * 30}s`,
    opacity: Math.random() * 0.15 + 0.05,
    blur: Math.random() > 0.5 ? "blur(1px)" : "none",
  }));
}

export function AuthBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="paper-texture pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
      {/* Subtle Ambient Light */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
        <div 
          className="absolute -left-[10%] -top-[10%] h-[60%] w-[60%] rounded-full bg-primary/5 blur-[120px]" 
        />
        <div 
          className="absolute -right-[10%] -bottom-[10%] h-[60%] w-[60%] rounded-full bg-primary/5 blur-[120px]" 
        />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 z-10 opacity-[0.02] [background-image:linear-gradient(to_right,var(--foreground)_1px,transparent_1px),linear-gradient(to_bottom,var(--foreground)_1px,transparent_1px)] [background-size:40px_40px]" />

      {/* Vignette */}
      <div className="absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_100%)] opacity-50" />
    </div>
  );
}
