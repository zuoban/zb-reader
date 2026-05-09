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
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${100 + Math.random() * 20}%`,
    size: `${4 + Math.random() * 8}px`,
    duration: `${15 + Math.random() * 15}s`,
    delay: `-${Math.random() * 20}s`,
    opacity: 0.1 + Math.random() * 0.2,
  }));
}

export function AuthBackground() {
  const [particles, setParticles] = useState<Particle[] | null>(null);

  useEffect(() => {
    setParticles(generateParticles(15));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
      {/* Mesh Gradient Base */}
      <div className="absolute inset-[-20%] z-0 overflow-hidden opacity-50 dark:opacity-30">
        <div 
          className="absolute left-[10%] top-[10%] h-[80%] w-[80%] rounded-full bg-indigo-500/40 blur-[120px]" 
          style={{ animation: "aurora-1 30s ease-in-out infinite" }}
        />
        <div 
          className="absolute right-[5%] top-[20%] h-[70%] w-[70%] rounded-full bg-violet-500/30 blur-[110px]" 
          style={{ animation: "aurora-2 35s ease-in-out infinite" }}
        />
        <div 
          className="absolute left-[15%] bottom-[10%] h-[75%] w-[75%] rounded-full bg-sky-400/30 blur-[130px]" 
          style={{ animation: "aurora-3 40s ease-in-out infinite" }}
        />
        <div 
          className="absolute right-[10%] bottom-[5%] h-[60%] w-[60%] rounded-full bg-indigo-600/20 blur-[100px]" 
          style={{ animation: "aurora-4 32s ease-in-out infinite" }}
        />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 z-10">
        {particles?.map((p) => (
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
              boxShadow: `0 0 10px rgba(99, 102, 241, ${p.opacity * 0.5})`,
            }}
          />
        ))}
      </div>

      {/* Grid Pattern with fading mask */}
      <div className="absolute inset-0 z-20 opacity-[0.04] [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_10%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_8%,transparent)_1px,transparent_1px)] [background-size:80px_80px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent_90%)]" />

      {/* Abstract Book Shapes (Glassmorphism) */}
      <div className="absolute inset-0 z-30 hidden lg:block">
        <div 
          className="absolute left-[8%] top-[20%] h-48 w-36 -rotate-12 rounded-lg border border-white/30 bg-white/10 shadow-2xl backdrop-blur-xl"
          style={{ 
            animation: "blob-float 20s ease-in-out infinite",
            background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))"
          }}
        >
           <div className="absolute inset-x-4 top-6 h-1.5 w-2/3 rounded-full bg-indigo-500/20" />
           <div className="absolute inset-x-4 top-11 h-1 w-full rounded-full bg-slate-500/10" />
           <div className="absolute inset-x-4 top-16 h-1 w-5/6 rounded-full bg-slate-500/10" />
        </div>

        <div 
          className="absolute right-[12%] top-[15%] h-56 w-40 rotate-6 rounded-lg border border-white/30 bg-white/10 shadow-2xl backdrop-blur-xl"
          style={{ 
            animation: "blob-float 25s ease-in-out infinite reverse",
            background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))"
          }}
        >
           <div className="absolute inset-x-4 top-8 h-1.5 w-1/2 rounded-full bg-violet-500/30" />
           <div className="absolute inset-x-4 top-13 h-1 w-full rounded-full bg-slate-500/10" />
           <div className="absolute inset-x-4 top-18 h-1 w-4/5 rounded-full bg-slate-500/10" />
        </div>

        <div 
          className="absolute right-[15%] bottom-[15%] h-44 w-32 -rotate-6 rounded-lg border border-white/30 bg-white/10 shadow-2xl backdrop-blur-xl"
          style={{ 
            animation: "blob-float 22s ease-in-out infinite",
            background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))"
          }}
        >
           <div className="absolute inset-x-4 top-6 h-1.5 w-3/4 rounded-full bg-sky-500/20" />
           <div className="absolute inset-x-4 top-11 h-1 w-full rounded-full bg-slate-500/10" />
        </div>
      </div>

      {/* Vignette Overlay */}
      <div className="absolute inset-0 z-40 bg-[radial-gradient(circle_at_center,transparent_0%,color-mix(in_oklab,var(--background)_40%,transparent)_100%)]" />
    </div>
  );
}
