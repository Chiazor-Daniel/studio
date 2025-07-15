'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Department, QueueState } from '@/lib/types';
import { departments } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { callNextCustomerAction, removeCustomerAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserX, ChevronRight } from 'lucide-react';

type AdminDashboardProps = {
  initialState: QueueState;
};

export function AdminDashboard({ initialState }: AdminDashboardProps) {
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleCallNext = async (department: Department) => {
    setIsSubmitting(prev => ({ ...prev, [`call-${department}`]: true }));
    const result = await callNextCustomerAction(department);
    if (result.success) {
      toast({ title: 'Success', description: `Called next customer for ${department}.` });
    } else {
      toast({ title: 'Error', description: 'Failed to call next customer.', variant: 'destructive' });
    }
    setIsSubmitting(prev => ({ ...prev, [`call-${department}`]: false }));
  };
  
  const handleRemove = async (userId: string, userName: string) => {
    setIsSubmitting(prev => ({ ...prev, [`remove-${userId}`]: true }));
    const result = await removeCustomerAction(userId);
    if (result.success) {
      toast({ title: 'Success', description: `Removed ${userName} from the queue.` });
    } else {
      toast({ title: 'Error', description: 'Failed to remove customer.', variant: 'destructive' });
    }
     setIsSubmitting(prev => ({ ...prev, [`remove-${userId}`]: false }));
  }

  return (
    <Tabs defaultValue={departments[0]} className="w-full">
      <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
        {departments.map((dept) => (
          <TabsTrigger key={dept} value={dept}>
            {dept} ({initialState[dept].queue.length})
          </TabsTrigger>
        ))}
      </TabsList>
      {departments.map((dept) => (
        <TabsContent key={dept} value={dept}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Queue for {dept}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Now serving: #{initialState[dept].serving.user?.queueNumber ?? 'N/A'} - {initialState[dept].serving.user?.name ?? 'Nobody'}
                </p>
              </div>
              <Button onClick={() => handleCallNext(dept)} disabled={isSubmitting[`call-${dept}`] || initialState[dept].queue.length === 0}>
                {isSubmitting[`call-${dept}`] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                Call Next
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Counter</TableHead>
                    <TableHead>Wait Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialState[dept].queue.length > 0 ? (
                    initialState[dept].queue.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-bold text-lg">{user.queueNumber}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.contact}</TableCell>
                        <TableCell className="text-muted-foreground">{user.counter}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(user.joinedAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleRemove(user.id, user.name)}
                                disabled={isSubmitting[`remove-${user.id}`]}
                                aria-label="Remove user"
                            >
                                {isSubmitting[`remove-${user.id}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4 text-destructive" />}
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        The queue is empty.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
