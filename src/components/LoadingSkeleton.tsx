type LoadingSkeletonProps = {
  className?: string;
};

type LoadingCardListProps = {
  count?: number;
  label: string;
  compact?: boolean;
  className?: string;
};

export function LoadingSkeleton({ className = '' }: LoadingSkeletonProps) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} />;
}

export function LoadingCardList({
  count = 3,
  label,
  compact = false,
  className = '',
}: LoadingCardListProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="grid gap-3">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className={`rounded-xl border border-border bg-white shadow-sm ${compact ? 'p-4' : 'p-5'}`}
          >
            <div className="flex items-start gap-4">
              <LoadingSkeleton className="h-11 w-11 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-3">
                <LoadingSkeleton className="h-5 w-2/3 rounded-md" />
                <LoadingSkeleton className="h-4 w-full rounded-md" />
                {!compact ? <LoadingSkeleton className="h-4 w-4/5 rounded-md" /> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
