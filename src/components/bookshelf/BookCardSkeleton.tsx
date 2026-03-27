import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BookCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card py-0">
      <div className="aspect-[3/4] bg-muted relative">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </Card>
  );
}
