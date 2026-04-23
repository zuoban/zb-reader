"use client";

export function BackgroundDecoration() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(112deg,color-mix(in_oklab,var(--cta)_9%,transparent)_0%,transparent_32%,color-mix(in_oklab,var(--chart-3)_8%,transparent)_68%,transparent_100%),linear-gradient(180deg,color-mix(in_oklab,white_38%,transparent)_0%,transparent_44%)] dark:bg-[linear-gradient(112deg,color-mix(in_oklab,var(--cta)_7%,transparent)_0%,transparent_34%,color-mix(in_oklab,var(--chart-3)_7%,transparent)_70%,transparent_100%),linear-gradient(180deg,color-mix(in_oklab,white_5%,transparent)_0%,transparent_46%)]" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_6%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_5%,transparent)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_76%)] dark:opacity-[0.08]" />
      <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,color-mix(in_oklab,white_58%,transparent),transparent)] dark:bg-[linear-gradient(180deg,color-mix(in_oklab,white_7%,transparent),transparent)]" />

      <div className="absolute inset-x-[-6rem] top-[7.5rem] h-56 -rotate-3 opacity-75 blur-[0.2px] [background:linear-gradient(90deg,transparent,color-mix(in_oklab,var(--glass-strong)_62%,transparent)_18%,color-mix(in_oklab,var(--glass)_42%,transparent)_64%,transparent)] [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_54%,transparent)] dark:opacity-45" />
      <div className="absolute inset-x-[-5rem] top-[22rem] h-52 rotate-2 opacity-60 [background:linear-gradient(90deg,transparent,color-mix(in_oklab,var(--glass-strong)_50%,transparent)_22%,color-mix(in_oklab,var(--glass)_34%,transparent)_72%,transparent)] [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_58%,transparent)] dark:opacity-38" />

      <div className="absolute inset-x-0 top-[12.4rem] h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,white_76%,transparent),color-mix(in_oklab,var(--cta)_24%,transparent),transparent)] opacity-80 dark:opacity-28" />
      <div className="absolute inset-x-0 top-[28.7rem] h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,white_58%,transparent),color-mix(in_oklab,var(--chart-3)_18%,transparent),transparent)] opacity-65 dark:opacity-24" />

      <svg
        viewBox="0 0 1440 960"
        className="absolute inset-0 h-full w-full opacity-[0.2] sm:opacity-[0.26] dark:opacity-[0.18]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="shelfGlow" x1="80" y1="120" x2="1300" y2="640" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="18%" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="62%" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bookSpine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        <g className="text-foreground/18 dark:text-foreground/24">
          <path
            d="M96 192C304 160 494 166 668 204C826 238 1000 248 1338 188"
            stroke="url(#shelfGlow)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M64 454C280 416 472 422 650 462C844 506 1044 506 1376 444"
            stroke="url(#shelfGlow)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        <g className="hidden text-foreground/16 dark:text-white/12 md:block">
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

        <g transform="translate(124 124)" className="hidden animate-reader-breathe lg:block opacity-34 dark:opacity-28" style={{ animationDelay: "0.8s" }}>
          <path d="M0 0H92" stroke="currentColor" className="text-[color:var(--cta)]/20" strokeWidth="2" strokeLinecap="round" />
          <path d="M150 94H246" stroke="currentColor" className="text-cyan-700/14 dark:text-cyan-300/14" strokeWidth="2" strokeLinecap="round" />
          <path d="M42 222H184" stroke="currentColor" className="text-foreground/10" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
