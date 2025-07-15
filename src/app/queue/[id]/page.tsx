import { QueueStatusCard } from '@/components/queue-status-card';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function QueueStatusPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 flex items-center justify-center min-h-full">
      <div className="w-full max-w-lg">
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <QueueStatusCard userId={params.id} />
        </Suspense>
      </div>
    </div>
  );
}
