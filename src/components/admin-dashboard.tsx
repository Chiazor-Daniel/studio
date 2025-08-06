'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Department } from '@/lib/types';
import { departments, counters as allCounters } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { LogOut, Users, Timer } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useQueue } from '@/hooks/use-queue';
import { useRouter } from 'next/navigation';

export function AdminDashboard() {
  const { queueState, getQueueStats } = useQueue();
  const router = useRouter();

  if (!queueState) {
    return <div className="text-center p-8">Loading queue state...</div>;
  }
  
  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    router.push('/admin/login');
  };

  const getTotalQueueLength = (dept: Department) => {
    if (!queueState || !queueState[dept]) return 0;
    return Object.values(queueState[dept].counters).reduce((sum, counter) => sum + counter.queue.length, 0);
  }

  const stats = getQueueStats();

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Queue Analytics</CardTitle>
          <CardDescription>A real-time overview of queue statistics across all departments.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center space-x-4 rounded-md border p-4">
                <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Total People Waiting</p>
                    <p className="text-2xl font-bold">{stats.totalWaiting}</p>
                </div>
            </div>
            <div className="flex items-center space-x-4 rounded-md border p-4">
                <div className="flex-shrink-0">
                    <Timer className="h-8 w-8 text-accent" />
                </div>
                <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Average Wait Time</p>
                    <p className="text-2xl font-bold">~{stats.averageWaitTime.toFixed(0)} min</p>
                </div>
            </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={departments[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-1 gap-1 h-auto sm:grid-cols-3">
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
                const counterState = queueState[dept].counters[counterName];
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
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[80px]">#</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Wait Time</TableHead>
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
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={4} className="h-24 text-center">
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
    </>
  );
}
