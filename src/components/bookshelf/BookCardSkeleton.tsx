import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BookCardSkeleton() {
  return (
    <Card className="surface-glass overflow-hidden rounded-3xl border border-border/50 bg-card/80 py-0">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <Skeleton className="h-full w-full" />
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>
    </Card>
  );
}
