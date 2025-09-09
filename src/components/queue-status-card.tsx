
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Hash, AlertTriangle, User, LogOut, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { getUserStatus, cancelUserTicket } from '@/app/actions';

function StatusSkeleton() {
    return (
        <Card className="shadow-lg">
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
    )
}


export function QueueStatusCard({ userId }: { userId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<UserStatus | 'not-found' | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchStatus = () => {
        startTransition(async () => {
            const newStatus = await getUserStatus(userId);
            setStatus(newStatus || 'not-found');
        });
    };

    if (status === null) {
       fetchStatus(); // Initial fetch
    }
    
    // Poll for changes
    const interval = setInterval(fetchStatus, 5000); 

    return () => clearInterval(interval);
  }, [userId, status]);
  
  const handleCancel = async () => {
    setIsCancelling(true);
    const result = await cancelUserTicket(userId);
    setIsCancelling(false);

    if (result.success) {
        toast({
            title: "You've left the queue.",
            description: "Your spot has been successfully cancelled.",
        });
        // The useEffect will update the status to 'not-found' automatically
    } else {
        toast({
            variant: 'destructive',
            title: "Cancellation Failed",
            description: "Could not cancel your spot. Please try again.",
        });
    }
  }

  if (status === null) {
    return <StatusSkeleton />;
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
                      Your ticket could not be found. It may have been served or you have cancelled your spot. Please join the queue again if needed.
                  </p>
              </CardContent>
              <CardFooter>
                  <Button onClick={() => router.push('/')} className="w-full">
                      Join Queue Again
                  </Button>
              </CardFooter>
          </Card>
      );
  }

  return (
      <>
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
          <p className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-2"><Hash /> Total in Queue</p>
          <p className="text-2xl font-bold">{status.totalInQueue}</p>
        </div>
      </CardFooter>
    </Card>

    <div className="mt-6 flex justify-center">
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <Button variant="destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Cancel My Spot
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently remove you from the queue. You will lose your current spot and will need to rejoin if you change your mind.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Stay in Queue</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} disabled={isCancelling}>
                        {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Yes, Cancel My Spot
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
    </>
  );
}
