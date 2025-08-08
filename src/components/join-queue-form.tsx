
'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Building, User, Mail, Users, ArrowRight, Loader2, PartyPopper, Clock, Ticket } from 'lucide-react';
import type { Department, JoinQueueFormState } from '@/lib/types';
import { departments, counters } from '@/lib/types';
import { joinQueueAction } from '@/app/actions';

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

const initialState: JoinQueueFormState = {
  success: false,
  message: '',
};

export function JoinQueueForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(joinQueueAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const [selectedDepartment, setSelectedDepartment] = useState<Department | ''>('');
  const [availableCounters, setAvailableCounters] = useState<string[]>([]);
  
  // State for the modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const handleDepartmentChange = (value: string) => {
    const department = value as Department;
    setSelectedDepartment(department);
    setAvailableCounters(counters[department] || []);
  };

  useEffect(() => {
    if (state.success && state.userId) {
      setShowSuccessModal(true);
      formRef.current?.reset();
      setSelectedDepartment('');
      setAvailableCounters([]);
    }
    // You might want to show state.message in a toast for error cases
  }, [state]);


  const handleGoToStatus = () => {
    if (state.userId) {
      setShowSuccessModal(false);
      router.push(`/queue/${state.userId}`);
    }
  }

  const handleCloseModal = () => {
    setShowSuccessModal(false);
  }

  return (
    <>
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-center">Join the Queue</CardTitle>
        <CardDescription className="text-center">Select a service and enter your details to get your spot.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-6">
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
            <Select name="counter" disabled={!selectedDepartment} required>
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
          {!state.success && state.message && state.message !== 'Validation failed.' && (
              <p className="text-sm font-medium text-destructive text-center">{state.message}</p>
          )}
        </form>
      </CardContent>
    </Card>

    <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
                <div className="flex justify-center">
                    <PartyPopper className="h-16 w-16 text-primary" />
                </div>
                <DialogTitle className="text-center text-2xl font-headline">You're in the queue!</DialogTitle>
                <DialogDescription className="text-center">
                    You can check your status using the button below. A confirmation has been sent to your email.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                 <div className="flex justify-around text-center">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-1"><Ticket /> Your Position</p>
                        <p className="text-4xl font-bold">{state?.queueNumber}</p>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-1"><Clock /> Est. Wait</p>
                        <p className="text-4xl font-bold">~{state?.estimatedWaitTime}<span className="text-xl">min</span></p>
                    </div>
                </div>
            </div>
            <DialogFooter className="sm:justify-between flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" onClick={handleCloseModal}>
                    Close
                </Button>
                <Button onClick={handleGoToStatus}>
                    Check My Status <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
