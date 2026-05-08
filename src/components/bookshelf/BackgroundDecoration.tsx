"use client";

import { useMemo, useState, useEffect } from "react";

export function BackgroundDecoration() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate random particles
  const particles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${100 + Math.random() * 20}%`,
      size: `${3 + Math.random() * 7}px`,
      duration: `${20 + Math.random() * 15}s`,
      delay: `-${Math.random() * 25}s`,
      opacity: 0.08 + Math.random() * 0.15,
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
      {/* Mesh Gradient Base - Harmonious Indigo/Violet/Sky palette */}
      <div className="absolute inset-[-20%] z-0 overflow-hidden opacity-45 dark:opacity-25">
        <div 
          className="absolute left-[5%] top-[5%] h-[90%] w-[90%] rounded-full bg-indigo-500/30 blur-[120px]" 
          style={{ animation: "aurora-1 35s ease-in-out infinite" }}
        />
        <div 
          className="absolute right-[0%] top-[15%] h-[80%] w-[80%] rounded-full bg-violet-500/25 blur-[110px]" 
          style={{ animation: "aurora-2 40s ease-in-out infinite" }}
        />
        <div 
          className="absolute left-[10%] bottom-[0%] h-[85%] w-[85%] rounded-full bg-sky-400/25 blur-[130px]" 
          style={{ animation: "aurora-3 45s ease-in-out infinite" }}
        />
        <div 
          className="absolute right-[5%] bottom-[5%] h-[70%] w-[70%] rounded-full bg-indigo-600/15 blur-[100px]" 
          style={{ animation: "aurora-4 38s ease-in-out infinite" }}
        />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 z-10">
        {mounted && particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-indigo-400/20 dark:bg-indigo-300/10"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animation: `float-particle ${p.duration} linear infinite`,
              animationDelay: p.delay,
              boxShadow: `0 0 8px rgba(99, 102, 241, ${p.opacity * 0.4})`,
            }}
          />
        ))}
      </div>
      
      {/* Grid Pattern with fading mask */}
      <div className="absolute inset-0 z-20 opacity-[0.05] [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_10%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_8%,transparent)_1px,transparent_1px)] [background-size:80px_80px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent_90%)]" />
      
      {/* Decorative Shelf Silhouettes */}
      <svg
        viewBox="0 0 1440 960"
        className="absolute inset-0 z-30 h-full w-full opacity-[0.18] sm:opacity-[0.22] dark:opacity-[0.14]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shelfGlow" x1="80" y1="120" x2="1300" y2="640" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="18%" stopColor="currentColor" stopOpacity="0.12" />
            <stop offset="62%" stopColor="currentColor" stopOpacity="0.06" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bookSpine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        <g className="text-indigo-500 dark:text-indigo-400">
          <path
            d="M96 192C304 160 494 166 668 204C826 238 1000 248 1338 188"
            stroke="url(#shelfGlow)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M64 454C280 416 472 422 650 462C844 506 1044 506 1376 444"
            stroke="url(#shelfGlow)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>

        <g className="hidden text-slate-500/20 dark:text-white/8 md:block">
          <g transform="translate(150 214) rotate(-2)">
            <rect x="0" y="0" width="12" height="86" rx="4" fill="url(#bookSpine)" />
            <rect x="19" y="16" width="9" height="70" rx="4" fill="url(#bookSpine)" />
            <rect x="36" y="6" width="14" height="80" rx="4" fill="url(#bookSpine)" />
            <rect x="61" y="24" width="10" height="62" rx="4" fill="url(#bookSpine)" />
          </g>
          <g transform="translate(1118 462) rotate(3)">
            <rect x="0" y="8" width="10" height="74" rx="4" fill="url(#bookSpine)" />
            <rect x="18" y="0" width="14" height="82" rx="4" fill="url(#bookSpine)" />
            <rect x="40" y="18" width="9" height="64" rx="4" fill="url(#bookSpine)" />
            <rect x="57" y="10" width="12" height="72" rx="4" fill="url(#bookSpine)" />
          </g>
        </g>

        <g transform="translate(124 124)" className="hidden animate-reader-breathe lg:block opacity-25 dark:opacity-20" style={{ animationDelay: "0.8s" }}>
          <path d="M0 0H92" stroke="currentColor" className="text-indigo-500/20" strokeWidth="2" strokeLinecap="round" />
          <path d="M150 94H246" stroke="currentColor" className="text-violet-500/15" strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>

      {/* Vignette Overlay for depth */}
      <div className="absolute inset-0 z-40 bg-[radial-gradient(circle_at_center,transparent_30%,color-mix(in_oklab,var(--background)_25%,transparent)_100%)]" />
    </div>
  );
}
