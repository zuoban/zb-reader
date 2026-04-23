"use client";

export function BackgroundDecoration() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(185,130,36,0.16),transparent_28%),radial-gradient(circle_at_92%_8%,rgba(47,118,111,0.12),transparent_30%),linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.22)_48%,transparent_100%)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(213,162,64,0.12),transparent_30%),radial-gradient(circle_at_92%_8%,rgba(85,167,160,0.1),transparent_30%),linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.035)_48%,transparent_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_8%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_8%,transparent)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)] dark:opacity-[0.12]" />

      <svg
        viewBox="0 0 1440 960"
        className="absolute inset-0 h-full w-full opacity-[0.24] sm:opacity-[0.32] dark:opacity-[0.22]"
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
          <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        <g className="text-foreground/24 dark:text-foreground/30">
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

        <g transform="translate(124 124)" className="hidden animate-reader-breathe lg:block opacity-55 dark:opacity-45" style={{ animationDelay: "0.8s" }}>
          <circle cx="0" cy="0" r="6" fill="currentColor" className="text-[color:var(--cta)]/35" />
          <circle cx="176" cy="94" r="4" fill="currentColor" className="text-teal-700/25 dark:text-teal-300/25" />
          <circle cx="80" cy="222" r="5" fill="currentColor" className="text-foreground/18" />
          <path d="M38 54C74 42 112 46 150 66" stroke="currentColor" className="text-foreground/10 dark:text-white/10" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 10" />
        </g>
      </svg>
    </div>
  );
}
