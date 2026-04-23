import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BookCardSkeleton() {
  return (
    <Card className="book-card-glass relative overflow-hidden rounded-2xl py-0">
      <div className="liquid-hairline absolute inset-x-3 top-0 z-10 h-px opacity-70" />
      <div className="relative m-1.5 aspect-[5/7] overflow-hidden rounded-xl bg-muted/70 shadow-[inset_0_1px_0_color-mix(in_oklab,white_42%,transparent),inset_0_-1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent)]">
        <Skeleton className="h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-end bg-gradient-to-t from-black/28 via-black/8 to-transparent px-2 py-2 sm:px-2.5 sm:py-2.5">
          <Skeleton className="h-[18px] w-12 rounded-full bg-white/18" />
        </div>
      </div>
      <div className="flex min-h-[51px] flex-col px-2.5 pb-2 pt-1.5 sm:min-h-[53px]">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1 space-y-0.5">
            <Skeleton className="h-[11px] w-full sm:h-[12px]" />
            <Skeleton className="h-[9px] w-2/3 sm:h-[10px]" />
          </div>
          <Skeleton className="h-5.5 w-5.5 shrink-0 rounded-md sm:rounded-lg" />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-1.5">
          <Skeleton className="h-[8px] w-10 sm:h-[9px]" />
          <Skeleton className="h-[8px] w-8 sm:h-[9px]" />
        </div>
      </div>
    </Card>
  );
}
