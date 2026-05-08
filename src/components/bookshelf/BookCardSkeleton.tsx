import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BookCardSkeleton() {
  return (
    <Card className="book-card-glass relative gap-3 overflow-hidden rounded-2xl py-0">
      <div className="liquid-hairline absolute inset-x-3 top-0 z-10 h-px opacity-70" />
      <div className="liquid-control relative m-1.5 aspect-[4/5] overflow-hidden rounded-xl">
        <Skeleton className="h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-end bg-gradient-to-t from-black/28 via-black/8 to-transparent px-2 py-2 sm:px-2.5 sm:py-2.5">
          <Skeleton className="h-[18px] w-12 rounded-full" />
        </div>
      </div>
      <div className="flex min-h-[62px] flex-col px-3.5 pb-3.5 pt-1.5 sm:min-h-[68px]">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-[14px] w-full sm:h-[15px]" />
            <Skeleton className="h-[14px] w-2/3 sm:h-[15px]" />
          </div>
          <Skeleton className="h-7 w-7 shrink-0 rounded-lg" />
        </div>
        <div className="mt-2.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-[10px] w-20 sm:h-[11px]" />
            <Skeleton className="h-[16px] w-12 rounded-md" />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border/10 pt-2.5">
            <Skeleton className="h-[14px] w-14 rounded-full sm:h-[16px]" />
            <Skeleton className="h-[10px] w-12 sm:h-[11px]" />
          </div>
        </div>
      </div>
    </Card>
  );
}
