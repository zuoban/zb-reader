import { BackgroundDecoration } from "@/components/bookshelf/BackgroundDecoration";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-noise relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <BackgroundDecoration />
      <div className="relative w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
