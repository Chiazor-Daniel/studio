export type Department = 'Customer Service' | 'New Accounts' | 'Loans & Mortgages';

export const departments: Department[] = ['Customer Service', 'New Accounts', 'Loans & Mortgages'];

export const counters: Record<Department, string[]> = {
  'Customer Service': ['Counter 1', 'Counter 2', 'Counter 3'],
  'New Accounts': ['Counter 4', 'Counter 5'],
  'Loans & Mortgages': ['Counter 6'],
};

export type QueueUser = {
  id: string;
  name: string;
  contact: string;
  department: Department;
  counter: string;
  queueNumber: number;
  joinedAt: Date | string; // Allow string for serialization
  estimatedWaitTime?: number;
  confidence?: string;
};

export type ServingInfo = {
  user: QueueUser | null;
  startedAt: Date | string | null; // Allow string for serialization
};

export type CounterState = {
    queue: QueueUser[];
    serving: ServingInfo;
    lastQueueNumber: number;
}

export type DepartmentState = {
  counters: Record<string, CounterState>;
};

export type QueueState = Record<Department, DepartmentState>;

export type UserStatus = {
  position: number;
  estimatedWaitTime?: number;
  confidence?: string;
  department: Department;
  counter: string;
  queueNumber: number;
  currentlyServing: number | null;
  totalInQueue: number;
  userName: string;
};

// This type is for the success modal after joining the queue
export type JoinQueueFormState = {
  message: string;
  errors?: Record<string, string[]>;
  success: boolean;
  userId?: string;
  queueNumber?: number;
  estimatedWaitTime?: number;
};
