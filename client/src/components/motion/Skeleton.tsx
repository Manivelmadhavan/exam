import { HTMLAttributes } from 'react';
import clsx from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />;
}

type BlockProps = HTMLAttributes<HTMLDivElement> & { line?: boolean };

/** A skeleton block for cards. */
export function SkeletonBlock({ className, children, line = false, ...rest }: BlockProps) {
  return (
    <div className={clsx('card p-5', className)} {...rest}>
      {children ?? (
        <div className="space-y-3">
          <Skeleton className={line ? 'h-3 w-1/3' : 'h-4 w-1/2'} />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Skeleton row used as a table / list placeholder. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center gap-4 px-4 py-3', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 flex-1" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}

/** Full-page skeleton used while lazy routes load. */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} line />)}
      </div>
      <SkeletonBlock className="p-0">
        <div className="space-y-0 py-2">
          {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} className={i % 2 ? 'bg-slate-50/50' : ''} />)}
        </div>
      </SkeletonBlock>
    </div>
  );
}