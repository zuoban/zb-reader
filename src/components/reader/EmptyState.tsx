export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-12">
      <div className="reader-liquid-control mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
        <Icon className="size-8" style={{ color: "var(--reader-muted-text)" }} />
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--reader-text)" }}>
        {title}
      </p>
      <p className="mt-1.5 text-xs" style={{ color: "var(--reader-muted-text)" }}>
        {description}
      </p>
    </div>
  );
}
