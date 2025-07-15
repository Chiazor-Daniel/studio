'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Building, User, Mail, Users, ArrowRight, Loader2, PartyPopper, Clock, Ticket } from 'lucide-react';
import type { Department, JoinQueueFormState } from '@/lib/types';
import { departments, counters } from '@/lib/types';
import { useQueue } from '@/hooks/use-queue';

function SubmitButton({ pending }: { pending: boolean }) {
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
  const { addUserToQueue } = useQueue();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [selectedDepartment, setSelectedDepartment] = useState<Department | ''>('');
  const [availableCounters, setAvailableCounters] = useState<string[]>([]);
  
  // State for the modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalData, setModalData] = useState<JoinQueueFormState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for form validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDepartmentChange = (value: string) => {
    const department = value as Department;
    setSelectedDepartment(department);
    setAvailableCounters(counters[department] || []);
    if (errors.department) setErrors(e => ({...e, department: ''}));
    // Reset counter value visually if needed, though not strictly necessary with controlled components
  };

  const validateForm = (formData: FormData) => {
    const newErrors: Record<string, string> = {};
    if (!formData.get('department')) newErrors.department = 'Please select a department.';
    if (!formData.get('counter')) newErrors.counter = 'Please select a counter.';
    if ((formData.get('name') as string).length < 2) newErrors.name = 'Name must be at least 2 characters.';
    if (!/^\S+@\S+\.\S+$/.test(formData.get('contact') as string)) newErrors.contact = 'Please enter a valid email.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(event.currentTarget);
    if (!validateForm(formData)) {
      setIsSubmitting(false);
      return;
    }
    
    const newUserInput = {
      name: formData.get('name') as string,
      contact: formData.get('contact') as string,
      department: formData.get('department') as Department,
      counter: formData.get('counter') as string,
    };

    // Simulate AI estimation
    const estimatedWaitTime = Math.floor(Math.random() * 15) + 5;
    const confidence = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
    
    const newUser = addUserToQueue({ ...newUserInput, estimatedWaitTime, confidence });
    
    setModalData({
      success: true,
      message: 'Success!',
      userId: newUser.id,
      queueNumber: newUser.queueNumber,
      estimatedWaitTime: newUser.estimatedWaitTime,
    });
    
    setShowSuccessModal(true);
    formRef.current?.reset();
    setSelectedDepartment('');
    setAvailableCounters([]);
    setIsSubmitting(false);
  };

  const handleGoToStatus = () => {
    if (modalData?.userId) {
      setShowSuccessModal(false);
      router.push(`/queue/${modalData.userId}`);
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
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>
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
            {errors.department && <p className="text-sm font-medium text-destructive">{errors.department}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="counter"><Users className="inline-block mr-2 h-4 w-4" />Counter</Label>
            <Select name="counter" disabled={!selectedDepartment} required onValueChange={() => {if (errors.counter) setErrors(e => ({...e, counter: ''}))}}>
              <SelectTrigger id="counter" className="w-full">
                <SelectValue placeholder="Select a counter" />
              </SelectTrigger>
              <SelectContent>
                {availableCounters.map((counter) => (
                  <SelectItem key={counter} value={counter}>{counter}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.counter && <p className="text-sm font-medium text-destructive">{errors.counter}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name"><User className="inline-block mr-2 h-4 w-4" />Full Name</Label>
            <Input id="name" name="name" placeholder="John Doe" required onChange={() => {if (errors.name) setErrors(e => ({...e, name: ''}))}} />
            {errors.name && <p className="text-sm font-medium text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact"><Mail className="inline-block mr-2 h-4 w-4" />Email Address</Label>
            <Input id="contact" name="contact" type="email" placeholder="you@example.com" required onChange={() => {if (errors.contact) setErrors(e => ({...e, contact: ''}))}}/>
             {errors.contact && <p className="text-sm font-medium text-destructive">{errors.contact}</p>}
          </div>

          <SubmitButton pending={isSubmitting} />
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
                    You can check your status using the button below. A confirmation has been logged to the console.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                 <div className="flex justify-around text-center">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-1"><Ticket /> Your Number</p>
                        <p className="text-4xl font-bold">{modalData?.queueNumber}</p>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground font-medium flex items-center justify-center gap-1"><Clock /> Est. Wait</p>
                        <p className="text-4xl font-bold">~{modalData?.estimatedWaitTime}<span className="text-xl">min</span></p>
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
