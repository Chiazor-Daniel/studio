'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserStatus, Department } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Hash, AlertTriangle, User } from 'lucide-react';
import { useQueue } from '@/hooks/use-queue';

function QueueStatusCardContent({ userId }: { userId: string }) {
  const { getUserStatus } = useQueue();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<UserStatus | 'not-found' | null>(null);

  useEffect(() => {
    const fetchStatus = () => {
      let newStatus = getUserStatus(userId);
      
      // If user is not in local storage (e.g., accessed from email link), use query params as fallback
      if (!newStatus) {
        const name = searchParams.get('name');
        const queueNumber = searchParams.get('queueNumber');
        const department = searchParams.get('department') as Department;
        const counter = searchParams.get('counter');
        const estimatedWaitTime = searchParams.get('estimatedWaitTime');
        const confidence = searchParams.get('confidence');

        if (name && queueNumber && department && counter) {
            newStatus = {
                userName: name,
                queueNumber: parseInt(queueNumber, 10),
                department: department,
                counter: counter,
                estimatedWaitTime: estimatedWaitTime ? parseInt(estimatedWaitTime, 10) : 10,
                confidence: confidence || 'medium',
                position: 1, // Defaulting as we don't know the real position
                totalInQueue: 1, // Defaulting
                currentlyServing: null, // Defaulting
            };
        }
      }

      setStatus(newStatus || 'not-found');
    };

    fetchStatus(); // Initial fetch
    
    // Poll for changes, as another tab (e.g., admin) could update the state
    const interval = setInterval(fetchStatus, 2000); 

    return () => clearInterval(interval);
  }, [userId, getUserStatus, searchParams]);

  if (status === null) {
    return (
      <Card className="shadow-lg animate-pulse">
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto mt-2" />
        </CardHeader>
        <CardContent className="text-center space-y-8 py-10">
            <Skeleton className="h-24 w-24 rounded-full mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-4 text-center">
            <div>
                <Skeleton className="h-6 w-20 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto mt-2" />
            </div>
            <div>
                <Skeleton className="h-6 w-20 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto mt-2" />
            </div>
        </CardFooter>
      </Card>
    );
  }

  if (status === 'not-found') {
      return (
          <Card className="shadow-lg border-destructive">
              <CardHeader className="items-center text-center">
                  <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                  <CardTitle className="text-2xl font-headline">Position Not Found</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                  <p className="text-muted-foreground">
                      Your ticket could not be found. It may have expired or already been served. Please join the queue again if needed.
                  </p>
              </CardContent>
          </Card>
      );
  }

  return (
    <Card className="shadow-lg overflow-hidden">
      <CardHeader className="bg-primary text-primary-foreground text-center p-6">
        <CardTitle className="text-3xl font-headline">Hello, {status.userName}!</CardTitle>
        <CardDescription className="text-primary-foreground/80">
          You are in the queue for {status.department}.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-6 py-10">
        <div>
          <p className="text-sm text-muted-foreground font-medium">YOUR POSITION AT {status.counter.toUpperCase()}</p>
          <p className="text-8xl font-bold text-primary transition-all duration-300">{status.position}</p>
          <p className="text-muted-foreground">out of {status.totalInQueue} people at this counter</p>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">ESTIMATED WAIT TIME</p>
          <p className="text-2xl font-semibold text-accent">
            <Clock className="inline-block mr-2 h-6 w-6" />
            ~{status.estimatedWaitTime ?? 'N/A'} minutes
          </p>
          <p className="text-xs text-muted-foreground capitalize">Confidence: {status.confidence ?? 'N/A'}</p>
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-4 text-center bg-muted/50 p-4">
        <div>
          <p className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-2"><User /> Now Serving</p>
          <p className="text-2xl font-bold">{status.currentlyServing ?? '---'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-2"><Hash /> Your Number</p>
          <p className="text-2xl font-bold">{status.queueNumber}</p>
        </div>
      </CardFooter>
    </Card>
  );
}

export function QueueStatusCard({ userId }: { userId: string }) {
  return (
    <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
      <QueueStatusCardContent userId={userId} />
    </Suspense>
  );
}
