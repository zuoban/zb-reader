import { AuthBackground } from "@/components/auth/AuthBackground";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-noise liquid-page relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <AuthBackground />
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
