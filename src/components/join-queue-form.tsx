
'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { joinQueueAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Building, User, Mail, Users, ArrowRight, Loader2 } from 'lucide-react';
import type { Department } from '@/lib/types';
import { departments, counters } from '@/lib/types';

const initialState = {
  message: '',
  errors: {},
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={pending}>
      {pending ? (
        <>
         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
         Joining...
        </>
      ) : (
        <>
          Join Queue
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export function JoinQueueForm() {
  const [state, formAction] = useActionState(joinQueueAction, initialState);
  const router = useRouter();
  const { toast } = useToast();

  const [selectedDepartment, setSelectedDepartment] = useState<Department | ''>('');
  const [availableCounters, setAvailableCounters] = useState<string[]>([]);
  const [departmentKey, setDepartmentKey] = useState(0);
  const [counterKey, setCounterKey] = useState(0);


  useEffect(() => {
    if (state.success && state.userId) {
      toast({
        title: 'Success!',
        description: state.message,
        variant: 'default',
      });
      router.push(`/queue/${state.userId}`);
    } else if (!state.success && state.message) {
      toast({
        title: 'Error',
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, router, toast]);

  const handleDepartmentChange = (value: string) => {
    const department = value as Department;
    setSelectedDepartment(department);
    setAvailableCounters(counters[department] || []);
    setCounterKey(prev => prev + 1); // Reset counter select
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-center">Join the Queue</CardTitle>
        <CardDescription className="text-center">Select a service and enter your details to get your spot.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="department"><Building className="inline-block mr-2 h-4 w-4" />Department</Label>
            <Select name="department" onValueChange={handleDepartmentChange} required>
              <SelectTrigger id="department" className="w-full">
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.errors?.department && <p className="text-sm font-medium text-destructive">{state.errors.department[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="counter"><Users className="inline-block mr-2 h-4 w-4" />Counter</Label>
            <Select key={counterKey} name="counter" disabled={!selectedDepartment} required>
              <SelectTrigger id="counter" className="w-full">
                <SelectValue placeholder="Select a counter" />
              </SelectTrigger>
              <SelectContent>
                {availableCounters.map((counter) => (
                  <SelectItem key={counter} value={counter}>{counter}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.errors?.counter && <p className="text-sm font-medium text-destructive">{state.errors.counter[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name"><User className="inline-block mr-2 h-4 w-4" />Full Name</Label>
            <Input id="name" name="name" placeholder="John Doe" required />
            {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact"><Mail className="inline-block mr-2 h-4 w-4" />Email Address</Label>
            <Input id="contact" name="contact" type="email" placeholder="you@example.com" required />
             {state.errors?.contact && <p className="text-sm font-medium text-destructive">{state.errors.contact[0]}</p>}
          </div>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
