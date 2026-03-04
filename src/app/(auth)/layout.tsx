export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(212,175,55,0.15),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(23,23,23,0.12),_transparent_32%)]" />
      <div className="relative w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
