"use client";

import { useState } from "react";

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
    size: `${Math.random() * 5 + 2}px`,
    duration: `${Math.random() * 30 + 30}s`,
    delay: `-${Math.random() * 30}s`,
    opacity: Math.random() * 0.12 + 0.03,
    blur: Math.random() > 0.6 ? "blur(1px)" : "none",
  }));
}

export function BackgroundDecoration() {
  // Generate particles once at mount
  const [particles] = useState<Particle[]>(() => generateParticles(25));

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background transition-colors duration-700">
      {/* Ambient Mesh Gradient Base */}
      <div className="absolute inset-[-20%] z-0 overflow-hidden opacity-30 mix-blend-normal dark:opacity-20 dark:mix-blend-screen transition-opacity duration-700">
        <div 
          className="absolute left-[10%] top-[5%] h-[70%] w-[70%] rounded-full bg-amber-400/30 blur-[120px] dark:bg-indigo-500/25" 
          style={{ animation: "aurora-1 45s ease-in-out infinite" }}
        />
        <div 
          className="absolute right-[5%] top-[15%] h-[60%] w-[60%] rounded-full bg-rose-400/20 blur-[100px] dark:bg-violet-600/25" 
          style={{ animation: "aurora-2 50s ease-in-out infinite" }}
        />
        <div 
          className="absolute left-[15%] bottom-[5%] h-[80%] w-[80%] rounded-full bg-blue-400/25 blur-[130px] dark:bg-sky-500/20" 
          style={{ animation: "aurora-3 55s ease-in-out infinite" }}
        />
        <div 
          className="absolute right-[10%] bottom-[10%] h-[50%] w-[50%] rounded-full bg-orange-300/20 blur-[90px] dark:bg-fuchsia-600/15" 
          style={{ animation: "aurora-4 40s ease-in-out infinite" }}
        />
      </div>

      {/* Floating Dust Particles */}
      <div className="absolute inset-0 z-10">
        {particles?.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-amber-600/40 dark:bg-indigo-300/30 transition-colors duration-700"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animation: `float-particle ${p.duration} linear infinite`,
              animationDelay: p.delay,
              filter: p.blur,
              boxShadow: `0 0 ${parseFloat(p.size) * 1.5}px rgba(217, 119, 6, ${p.opacity * 0.4})`,
            }}
          />
        ))}
      </div>
      
      {/* Elegant Dot Matrix Pattern */}
      <div className="absolute inset-0 z-20 opacity-[0.03] dark:opacity-[0.05] transition-opacity duration-700 [background-image:radial-gradient(color-mix(in_oklab,var(--foreground)_15%,transparent)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_90%_90%_at_50%_50%,black_10%,transparent_80%)]" />
      
      {/* Abstract Flowing Pages / Contour Lines */}
      <svg
        viewBox="0 0 1440 960"
        className="absolute inset-0 z-30 h-full w-full opacity-[0.4] sm:opacity-[0.5] dark:opacity-[0.3] transition-opacity duration-700 pointer-events-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="waveFlow1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="25%" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="75%" stopColor="currentColor" stopOpacity="0.03" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="waveFlow2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="40%" stopColor="currentColor" stopOpacity="0.06" />
            <stop offset="80%" stopColor="currentColor" stopOpacity="0.02" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ringGlow" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.05" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Top-left to bottom-right gentle wave sweeps (like pages turning) */}
        <g className="text-amber-700/60 dark:text-indigo-400/80">
          <path
            d="M-200 300C200 150 500 550 900 300C1300 50 1500 350 1800 200"
            stroke="url(#waveFlow1)"
            strokeWidth="1.5"
            fill="none"
            className="animate-reader-breathe" style={{ animationDuration: "12s" }}
          />
          <path
            d="M-200 320C230 180 530 580 930 330C1330 80 1530 380 1800 230"
            stroke="url(#waveFlow1)"
            strokeWidth="1"
            fill="none"
            className="animate-reader-breathe" style={{ animationDuration: "14s", animationDelay: "1s" }}
          />
          <path
            d="M-200 340C260 210 560 610 960 360C1360 110 1560 410 1800 260"
            stroke="url(#waveFlow1)"
            strokeWidth="0.5"
            fill="none"
            className="animate-reader-breathe" style={{ animationDuration: "16s", animationDelay: "2s" }}
          />
        </g>

        {/* Bottom-left to top-right counter waves */}
        <g className="text-rose-600/50 dark:text-violet-400/70">
          <path
            d="M-200 800C300 950 600 650 1100 850C1500 1050 1600 750 1800 900"
            stroke="url(#waveFlow2)"
            strokeWidth="1.5"
            fill="none"
            className="animate-reader-breathe" style={{ animationDuration: "15s", animationDelay: "0.5s" }}
          />
          <path
            d="M-200 820C330 980 630 680 1130 880C1530 1080 1630 780 1800 930"
            stroke="url(#waveFlow2)"
            strokeWidth="1"
            fill="none"
            className="animate-reader-breathe" style={{ animationDuration: "17s", animationDelay: "1.5s" }}
          />
        </g>

        {/* Abstract focal rings (representing focus and insight) */}
        <g className="text-orange-500/40 dark:text-sky-400/60">
          <circle cx="1200" cy="250" r="350" stroke="url(#ringGlow)" strokeWidth="1" fill="none" strokeDasharray="4 12" className="animate-reader-breathe" style={{ animationDuration: "20s" }} />
          <circle cx="1200" cy="250" r="500" stroke="url(#ringGlow)" strokeWidth="0.5" fill="none" strokeDasharray="2 16" className="animate-reader-breathe" style={{ animationDuration: "25s", animationDelay: "2s" }} />
        </g>
      </svg>

      {/* Subtle Vignette Overlay */}
      <div className="absolute inset-0 z-40 pointer-events-none bg-[radial-gradient(ellipse_100%_100%_at_50%_50%,transparent_40%,color-mix(in_oklab,var(--background)_40%,transparent)_100%)] dark:bg-[radial-gradient(ellipse_100%_100%_at_50%_50%,transparent_30%,color-mix(in_oklab,var(--background)_60%,transparent)_100%)]" />
    </div>
  );
}
