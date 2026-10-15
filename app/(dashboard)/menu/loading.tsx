import { Skeleton } from '@/components/ui/skeleton';

export default function MenuLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <Skeleton className="h-9 w-72" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
