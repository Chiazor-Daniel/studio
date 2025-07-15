'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Department, QueueState } from '@/lib/types';
import { departments, counters as allCounters } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { callNextCustomerAction, removeCustomerAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserX, ChevronRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type AdminDashboardProps = {
  initialState: QueueState;
};

export function AdminDashboard({ initialState }: AdminDashboardProps) {
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleCallNext = async (department: Department, counter: string) => {
    const key = `call-${department}-${counter}`;
    setIsSubmitting(prev => ({ ...prev, [key]: true }));
    const result = await callNextCustomerAction(department, counter);
    if (result.success) {
      toast({ title: 'Success', description: `Called next customer for ${counter}.` });
    } else {
      toast({ title: 'Error', description: 'Failed to call next customer.', variant: 'destructive' });
    }
    setIsSubmitting(prev => ({ ...prev, [key]: false }));
  };
  
  const handleRemove = async (userId: string, userName: string) => {
    const key = `remove-${userId}`;
    setIsSubmitting(prev => ({ ...prev, [key]: true }));
    const result = await removeCustomerAction(userId);
    if (result.success) {
      toast({ title: 'Success', description: `Removed ${userName} from the queue.` });
    } else {
      toast({ title: 'Error', description: 'Failed to remove customer.', variant: 'destructive' });
    }
     setIsSubmitting(prev => ({ ...prev, [key]: false }));
  }

  const getTotalQueueLength = (dept: Department) => {
    return Object.values(initialState[dept].counters).reduce((sum, counter) => sum + counter.queue.length, 0);
  }

  return (
    <Tabs defaultValue={departments[0]} className="w-full">
      <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
        {departments.map((dept) => (
          <TabsTrigger key={dept} value={dept}>
            {dept} ({getTotalQueueLength(dept)})
          </TabsTrigger>
        ))}
      </TabsList>
      {departments.map((dept) => (
        <TabsContent key={dept} value={dept}>
          <Accordion type="multiple" defaultValue={allCounters[dept]} className="w-full">
            {allCounters[dept].map((counterName) => {
              const counterState = initialState[dept].counters[counterName];
              if (!counterState) return null;
              
              const queue = counterState.queue;
              const servingUser = counterState.serving.user;

              return (
                <AccordionItem value={counterName} key={counterName}>
                   <AccordionTrigger className="text-xl font-semibold px-4">
                      {counterName} ({queue.length})
                    </AccordionTrigger>
                  <AccordionContent>
                    <Card className="border-0 shadow-none">
                      <CardHeader className="flex flex-row items-center justify-between pt-0">
                        <div>
                           <p className="text-sm text-muted-foreground">
                            Now serving: #{servingUser?.queueNumber ?? 'N/A'} - {servingUser?.name ?? 'Nobody'}
                          </p>
                        </div>
                        <Button 
                          onClick={() => handleCallNext(dept, counterName)} 
                          disabled={isSubmitting[`call-${dept}-${counterName}`] || queue.length === 0}
                          size="sm"
                        >
                          {isSubmitting[`call-${dept}-${counterName}`] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
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
                              <TableHead>Wait Time</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {queue.length > 0 ? (
                              queue.map((user) => (
                                <TableRow key={user.id}>
                                  <TableCell className="font-bold text-lg">{user.queueNumber}</TableCell>
                                  <TableCell>{user.name}</TableCell>
                                  <TableCell className="text-muted-foreground">{user.contact}</TableCell>
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
                                <TableCell colSpan={5} className="h-24 text-center">
                                  The queue for this counter is empty.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsContent>
      ))}
    </Tabs>
  );
}
