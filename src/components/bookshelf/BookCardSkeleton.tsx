import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BookCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-[0.85rem] border border-border/60 bg-card/96 sm:rounded-[0.95rem]">
      <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-foreground/12 to-transparent opacity-100" />
      <div className="relative aspect-[5/7] overflow-hidden bg-muted">
        <Skeleton className="h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/26 via-black/8 to-transparent px-2 py-2 sm:px-2.5 sm:py-2.5">
          <Skeleton className="h-[18px] w-9 rounded-full" />
          <Skeleton className="h-[18px] w-12 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col px-2 pb-1.5 pt-1">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1 space-y-0.5">
            <Skeleton className="h-[11px] w-full sm:h-[12px]" />
            <Skeleton className="h-[9px] w-2/3 sm:h-[10px]" />
          </div>
          <Skeleton className="h-5.5 w-5.5 shrink-0 rounded-md sm:rounded-lg" />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <Skeleton className="h-[8px] w-10 sm:h-[9px]" />
          <Skeleton className="h-[8px] w-8 sm:h-[9px]" />
        </div>
      </div>
    </Card>
  );
}
