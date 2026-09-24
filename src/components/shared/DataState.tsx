import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type DataStateProps = {
  state: 'loading' | 'empty' | 'error';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
};

/**
 * One consistent placeholder for the three things a data-backed page can show
 * besides real content. Every list page used to roll its own — a bare spinner,
 * a stray sentence, or nothing at all when the API was unreachable.
 */
export function DataState({
  state,
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon,
  className,
}: DataStateProps) {
  const FallbackIcon = state === 'error' ? AlertCircle : Inbox;
  const ResolvedIcon = Icon ?? FallbackIcon;

  return (
    <Card variant="gradient" className={cn('w-full', className)}>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            state === 'error'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-primary/10 text-primary',
          )}
        >
          <ResolvedIcon className="h-6 w-6" />
        </span>

        <h3 className="text-base font-semibold sm:text-lg">{title}</h3>

        {description && (
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        )}

        {actionLabel && onAction && (
          <Button variant="outline" size="sm" onClick={onAction} className="mt-1">
            <RefreshCw className="h-4 w-4" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Skeleton grid that matches the card grids the list pages render. */
export function DataStateSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="kv-grid">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
