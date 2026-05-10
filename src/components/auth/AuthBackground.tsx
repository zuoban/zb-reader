"use client";

export function AuthBackground() {
  return (
    <div className="paper-texture pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
      {/* Subtle Ambient Light */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30">
        <div 
          className="absolute -left-[10%] -top-[10%] h-[60%] w-[60%] rounded-full bg-primary/5 blur-[120px]" 
        />
        <div 
          className="absolute -right-[10%] -bottom-[10%] h-[60%] w-[60%] rounded-full bg-primary/5 blur-[120px]" 
        />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 z-10 opacity-[0.02] [background-image:linear-gradient(to_right,var(--foreground)_1px,transparent_1px),linear-gradient(to_bottom,var(--foreground)_1px,transparent_1px)] [background-size:40px_40px]" />

      {/* Vignette */}
      <div className="absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_100%)] opacity-50" />
    </div>
  );
}
