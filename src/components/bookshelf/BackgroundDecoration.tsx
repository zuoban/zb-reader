"use client";

export function BackgroundDecoration() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(110deg,color-mix(in_oklab,var(--cta)_10%,transparent)_0%,transparent_34%,color-mix(in_oklab,var(--chart-3)_10%,transparent)_67%,transparent_100%),linear-gradient(180deg,color-mix(in_oklab,white_34%,transparent)_0%,transparent_42%)] dark:bg-[linear-gradient(110deg,color-mix(in_oklab,var(--cta)_9%,transparent)_0%,transparent_36%,color-mix(in_oklab,var(--chart-3)_8%,transparent)_70%,transparent_100%),linear-gradient(180deg,color-mix(in_oklab,white_5%,transparent)_0%,transparent_45%)]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_7%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_7%,transparent)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)] dark:opacity-[0.11]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,color-mix(in_oklab,white_52%,transparent),transparent)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,white_6%,transparent),transparent)]" />

      <svg
        viewBox="0 0 1440 960"
        className="absolute inset-0 h-full w-full opacity-[0.18] sm:opacity-[0.24] dark:opacity-[0.18]"
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

        <g transform="translate(124 124)" className="hidden animate-reader-breathe lg:block opacity-45 dark:opacity-35" style={{ animationDelay: "0.8s" }}>
          <path d="M0 0H92" stroke="currentColor" className="text-[color:var(--cta)]/24" strokeWidth="2" strokeLinecap="round" />
          <path d="M150 94H246" stroke="currentColor" className="text-cyan-700/18 dark:text-cyan-300/18" strokeWidth="2" strokeLinecap="round" />
          <path d="M42 222H184" stroke="currentColor" className="text-foreground/14" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M38 54C74 42 112 46 150 66" stroke="currentColor" className="text-foreground/10 dark:text-white/10" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 10" />
        </g>
      </svg>
    </div>
  );
}
