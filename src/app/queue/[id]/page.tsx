import { QueueStatusCard } from '@/components/queue-status-card';
import { Suspense } from 'react';

// The QueueStatusCard component itself is now client-side, 
// so we wrap it in a Suspense boundary to handle the initial render.
export default function QueueStatusPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 flex items-center justify-center min-h-full">
      <div className="w-full max-w-lg">
        <Suspense>
          <QueueStatusCard userId={params.id} />
        </Suspense>
      </div>
    </div>
  );
}
