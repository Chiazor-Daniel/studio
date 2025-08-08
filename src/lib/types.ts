import type { ObjectId } from 'mongodb';

export type Department = 'Customer Service' | 'New Accounts' | 'Loans & Mortgages';

export const departments: Department[] = ['Customer Service', 'New Accounts', 'Loans & Mortgages'];

export const counters: Record<Department, string[]> = {
  'Customer Service': ['Counter 1', 'Counter 2', 'Counter 3'],
  'New Accounts': ['Counter 4', 'Counter 5'],
  'Loans & Mortgages': ['Counter 6'],
};

export type QueueUser = {
  _id?: ObjectId; // From MongoDB
  id?: string; // String version of _id
  name: string;
  contact: string;
  department: Department;
  counter: string;
  joinedAt: Date;
  calledAt?: Date;
  status: 'waiting' | 'serving' | 'served' | 'cancelled';
  queueNumber: number; // The ticket number they were assigned when called
  estimatedWaitTime?: number;
  confidence?: string;
};

export type UserStatus = {
  position: number;
  estimatedWaitTime?: number;
  confidence?: string;
  department: Department;
  counter: string;
  currentlyServing: number | null;
  totalInQueue: number;
  userName: string;
};

// This type is for the form state hook `useFormState`
export type JoinQueueFormState = {
  message: string;
  errors?: Record<string, string[]>;
  success: boolean;
  userId?: string;
  queueNumber?: number; // This is the position in the queue
  estimatedWaitTime?: number;
};
