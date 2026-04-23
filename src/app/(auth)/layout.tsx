export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-noise relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_4%,color-mix(in_oklab,var(--cta)_22%,transparent),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(47,118,111,0.13),transparent_32%),linear-gradient(135deg,transparent,rgba(255,255,255,0.2)_48%,transparent)] dark:bg-[radial-gradient(circle_at_18%_4%,color-mix(in_oklab,var(--cta)_14%,transparent),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(85,167,160,0.1),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_8%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_8%,transparent)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />
      <div className="relative w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
