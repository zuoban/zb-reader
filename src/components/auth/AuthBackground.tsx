"use client";

import { useEffect, useState } from "react";

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
  const [particles, setParticles] = useState<Particle[] | null>(null);

  useEffect(() => {
    setParticles(generateParticles(20));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background transition-colors duration-700">
      {/* Ambient Mesh Gradient Base - Focused, premium auth palette */}
      <div className="absolute inset-[-20%] z-0 overflow-hidden opacity-40 mix-blend-normal dark:opacity-25 dark:mix-blend-screen transition-opacity duration-700">
        <div 
          className="absolute left-[15%] top-[10%] h-[75%] w-[75%] rounded-full bg-indigo-500/30 blur-[130px] dark:bg-indigo-600/25" 
          style={{ animation: "aurora-1 40s ease-in-out infinite" }}
        />
        <div 
          className="absolute right-[5%] top-[20%] h-[65%] w-[65%] rounded-full bg-violet-400/25 blur-[120px] dark:bg-violet-700/25" 
          style={{ animation: "aurora-2 45s ease-in-out infinite" }}
        />
        <div 
          className="absolute left-[20%] bottom-[10%] h-[80%] w-[80%] rounded-full bg-sky-400/25 blur-[140px] dark:bg-cyan-600/20" 
          style={{ animation: "aurora-3 50s ease-in-out infinite" }}
        />
        <div 
          className="absolute right-[15%] bottom-[5%] h-[55%] w-[55%] rounded-full bg-fuchsia-400/20 blur-[110px] dark:bg-fuchsia-800/15" 
          style={{ animation: "aurora-4 35s ease-in-out infinite" }}
        />
      </div>

      {/* Floating Light Dust Particles */}
      <div className="absolute inset-0 z-10">
        {particles?.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-indigo-400/40 dark:bg-indigo-300/40 transition-colors duration-700"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animation: `float-particle ${p.duration} linear infinite`,
              animationDelay: p.delay,
              filter: p.blur,
              boxShadow: `0 0 ${parseFloat(p.size) * 1.5}px rgba(99, 102, 241, ${p.opacity * 0.5})`,
            }}
          />
        ))}
      </div>

      {/* Elegant Dot Matrix Pattern */}
      <div className="absolute inset-0 z-20 opacity-[0.035] dark:opacity-[0.06] transition-opacity duration-700 [background-image:radial-gradient(color-mix(in_oklab,var(--foreground)_15%,transparent)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_50%,black_20%,transparent_90%)]" />

      {/* Abstract Interlocking Rings & Waves - Represents secure connection / authentication */}
      <svg
        viewBox="0 0 1440 960"
        className="absolute inset-0 z-30 h-full w-full opacity-[0.4] sm:opacity-[0.5] dark:opacity-[0.35] transition-opacity duration-700 pointer-events-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="authWave" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="30%" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="70%" stopColor="currentColor" stopOpacity="0.04" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="authRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.06" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.02" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Dynamic Sweeping Waves */}
        <g className="text-indigo-600/60 dark:text-indigo-400/80">
          <path
            d="M-200 900C100 700 400 1000 900 600C1400 200 1600 500 1800 300"
            stroke="url(#authWave)"
            strokeWidth="1.5"
            fill="none"
            className="animate-reader-breathe" style={{ animationDuration: "14s" }}
          />
          <path
            d="M-200 920C130 730 430 1030 930 630C1430 230 1630 530 1800 330"
            stroke="url(#authWave)"
            strokeWidth="1"
            fill="none"
            className="animate-reader-breathe" style={{ animationDuration: "16s", animationDelay: "1s" }}
          />
        </g>

        {/* Concentric Security / Identity Rings */}
        <g className="text-violet-500/50 dark:text-violet-400/60">
          <circle cx="150" cy="150" r="400" stroke="url(#authRing)" strokeWidth="1" fill="none" strokeDasharray="4 16" className="animate-reader-breathe" style={{ animationDuration: "18s" }} />
          <circle cx="150" cy="150" r="550" stroke="url(#authRing)" strokeWidth="0.5" fill="none" strokeDasharray="2 20" className="animate-reader-breathe" style={{ animationDuration: "22s", animationDelay: "2s" }} />
        </g>
        
        <g className="text-sky-500/40 dark:text-sky-400/50">
          <circle cx="1300" cy="850" r="300" stroke="url(#authRing)" strokeWidth="1" fill="none" strokeDasharray="4 12" className="animate-reader-breathe" style={{ animationDuration: "20s", animationDelay: "1.5s" }} />
          <circle cx="1300" cy="850" r="450" stroke="url(#authRing)" strokeWidth="0.5" fill="none" strokeDasharray="2 16" className="animate-reader-breathe" style={{ animationDuration: "24s", animationDelay: "3s" }} />
        </g>
      </svg>

      {/* Deep Vignette Overlay to focus the center login card */}
      <div className="absolute inset-0 z-40 pointer-events-none bg-[radial-gradient(ellipse_100%_100%_at_50%_50%,transparent_30%,color-mix(in_oklab,var(--background)_50%,transparent)_100%)] dark:bg-[radial-gradient(ellipse_100%_100%_at_50%_50%,transparent_20%,color-mix(in_oklab,var(--background)_70%,transparent)_100%)]" />
    </div>
  );
}
