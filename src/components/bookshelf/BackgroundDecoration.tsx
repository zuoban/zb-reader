"use client";

export function BackgroundDecoration() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.028),transparent_24%),radial-gradient(circle_at_18%_14%,rgba(14,165,233,0.022),transparent_20%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.02),transparent_20%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.045),transparent_24%),radial-gradient(circle_at_18%_14%,rgba(14,165,233,0.03),transparent_20%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.03),transparent_20%)]" />
      <div className="animate-reader-breathe absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.05)_48%,transparent_100%)] opacity-8 dark:opacity-4" />

      <div className="animate-reader-breathe absolute right-[-10rem] top-10 hidden h-64 w-64 rounded-full bg-primary/4 blur-3xl lg:block dark:bg-primary/5" />
      <div className="animate-reader-breathe absolute bottom-10 left-[-7rem] hidden h-48 w-48 rounded-full bg-sky-500/4 blur-3xl xl:block dark:bg-sky-400/5" style={{ animationDelay: "1.1s" }} />

      <svg
        viewBox="0 0 1440 960"
        className="absolute inset-0 h-full w-full opacity-20 sm:opacity-28 dark:opacity-30 sm:dark:opacity-36"
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

        <g transform="translate(124 124)" className="hidden animate-reader-breathe lg:block opacity-60 dark:opacity-70" style={{ animationDelay: "0.8s" }}>
          <circle cx="0" cy="0" r="6" fill="currentColor" className="text-primary/20 dark:text-primary/30" />
          <circle cx="176" cy="94" r="4" fill="currentColor" className="text-sky-500/20 dark:text-sky-400/30" />
          <circle cx="80" cy="222" r="5" fill="currentColor" className="text-violet-500/20 dark:text-violet-400/30" />
          <path d="M38 54C74 42 112 46 150 66" stroke="currentColor" className="text-foreground/10 dark:text-white/10" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 10" />
        </g>
      </svg>
    </div>
  );
}
