"use client";

export function BackgroundDecoration() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.07),transparent_30%),radial-gradient(circle_at_20%_15%,rgba(14,165,233,0.06),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.06),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_30%),radial-gradient(circle_at_20%_15%,rgba(14,165,233,0.08),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.09),transparent_28%)]" />
      <div className="animate-reader-breathe absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.16)_48%,transparent_100%)] opacity-20 dark:opacity-8" />

      <div className="animate-reader-breathe absolute right-[-6rem] top-16 h-72 w-72 rounded-full bg-primary/7 blur-3xl dark:bg-primary/10" />
      <div className="animate-reader-breathe absolute bottom-12 left-[-5rem] h-64 w-64 rounded-full bg-sky-500/8 blur-3xl dark:bg-sky-400/8" style={{ animationDelay: "1.1s" }} />
      <div className="animate-reader-breathe absolute left-1/3 top-1/4 h-48 w-48 rounded-full bg-violet-500/8 blur-3xl dark:bg-violet-400/8" style={{ animationDelay: "2s" }} />

      <svg
        viewBox="0 0 1440 960"
        className="absolute inset-0 h-full w-full opacity-45 sm:opacity-55 dark:opacity-60 sm:dark:opacity-68"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shelfGlow" x1="120" y1="120" x2="1160" y2="800" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.06" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cardGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.55" />
            <stop offset="100%" stopColor="white" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="bookA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="bookB" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="bookC" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.45" />
          </linearGradient>
          <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        <g className="text-foreground/30 dark:text-foreground/40">
          <path
            d="M1040 116C895 74 742 88 616 170C488 253 421 404 394 528C366 652 272 754 116 820"
            stroke="url(#shelfGlow)"
            strokeWidth="2"
            strokeDasharray="8 14"
            strokeLinecap="round"
          />
          <path
            d="M1290 272C1112 234 953 278 822 370C728 436 659 516 540 550C448 577 339 569 214 518"
            stroke="url(#shelfGlow)"
            strokeWidth="1.5"
            strokeDasharray="6 12"
            strokeLinecap="round"
          />
        </g>

        <g transform="translate(960 178) rotate(-8)" className="animate-reader-surface origin-center">
          <rect x="0" y="0" width="292" height="372" rx="36" fill="url(#cardGlass)" />
          <rect x="0.75" y="0.75" width="290.5" height="370.5" rx="35.25" stroke="currentColor" className="text-border/40 dark:text-white/10" />

          <circle cx="212" cy="82" r="54" fill="url(#bookA)" filter="url(#softBlur)" opacity="0.9" />
          <circle cx="84" cy="278" r="58" fill="url(#bookB)" filter="url(#softBlur)" opacity="0.85" />

          <g transform="translate(62 76)">
            <rect x="0" y="80" width="168" height="18" rx="9" fill="currentColor" className="text-foreground/10 dark:text-white/10" />
            <rect x="16" y="12" width="48" height="118" rx="14" fill="url(#bookA)" />
            <rect x="72" y="0" width="42" height="130" rx="14" fill="url(#bookB)" />
            <rect x="120" y="24" width="36" height="106" rx="14" fill="url(#bookC)" />
            <rect x="22" y="24" width="4" height="82" rx="2" fill="white" fillOpacity="0.35" />
            <rect x="78" y="20" width="4" height="88" rx="2" fill="white" fillOpacity="0.3" />
            <rect x="126" y="36" width="4" height="72" rx="2" fill="white" fillOpacity="0.28" />
          </g>

          <g transform="translate(60 248)">
            <path d="M0 40C42 8 93 0 154 0C146 18 138 35 130 52C86 42 43 38 0 40Z" fill="currentColor" className="text-foreground/8 dark:text-white/10" />
            <path d="M18 36C57 18 95 14 132 18" stroke="currentColor" className="text-foreground/15 dark:text-white/15" strokeWidth="2" strokeLinecap="round" />
            <path d="M24 52C64 40 95 40 120 46" stroke="currentColor" className="text-foreground/12 dark:text-white/12" strokeWidth="2" strokeLinecap="round" />
          </g>
        </g>

        <g transform="translate(1032 604)" className="animate-reader-surface origin-center" style={{ animationDelay: "1.4s" }}>
          <ellipse cx="102" cy="112" rx="116" ry="28" fill="currentColor" className="text-foreground/5 dark:text-black/30" />
          <path d="M42 16C82 -18 144 -4 164 56C178 98 156 146 106 146C50 146 14 100 22 54C24 38 30 26 42 16Z" fill="currentColor" className="text-card/70 dark:text-zinc-900/80" />
          <path d="M44 14C60 36 70 68 70 108" stroke="currentColor" className="text-foreground/10 dark:text-white/10" strokeWidth="4" strokeLinecap="round" />
          <path d="M70 42C108 28 142 36 170 70" stroke="currentColor" className="text-foreground/12 dark:text-white/12" strokeWidth="4" strokeLinecap="round" />
          <path d="M58 54C86 26 122 20 150 34C184 52 192 92 178 122C158 166 94 178 52 146C10 114 14 78 58 54Z" fill="url(#cardGlass)" stroke="currentColor" className="text-border/30 dark:text-white/10" />
          <path d="M82 68L122 78L96 124L56 114L82 68Z" fill="url(#bookA)" opacity="0.75" />
          <path d="M120 78L154 88L128 132L96 124L120 78Z" fill="url(#bookB)" opacity="0.72" />
          <circle cx="132" cy="54" r="10" fill="url(#bookC)" opacity="0.8" />
        </g>

        <g transform="translate(124 124)" className="animate-reader-breathe" style={{ animationDelay: "0.8s" }}>
          <circle cx="0" cy="0" r="6" fill="currentColor" className="text-primary/20 dark:text-primary/30" />
          <circle cx="176" cy="94" r="4" fill="currentColor" className="text-sky-500/20 dark:text-sky-400/30" />
          <circle cx="80" cy="222" r="5" fill="currentColor" className="text-violet-500/20 dark:text-violet-400/30" />
          <path d="M38 54C74 42 112 46 150 66" stroke="currentColor" className="text-foreground/10 dark:text-white/10" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 10" />
        </g>
      </svg>
    </div>
  );
}
