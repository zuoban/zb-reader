import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BookCardSkeleton() {
  return (
    <Card className="book-card-glass relative overflow-hidden rounded-2xl p-0">
      <div className="relative m-1 aspect-[3/4] overflow-hidden rounded-xl bg-muted/40">
        <Skeleton className="h-full w-full opacity-40" />
      </div>
      <div className="relative flex flex-col px-3 pb-3 pt-2">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </Card>
  );
}
