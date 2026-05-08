import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[linear-gradient(110deg,color-mix(in_oklab,var(--glass)_54%,transparent),color-mix(in_oklab,var(--glass-highlight)_34%,transparent),color-mix(in_oklab,var(--glass)_54%,transparent))]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
