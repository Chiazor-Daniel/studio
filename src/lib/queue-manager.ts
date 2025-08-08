// This file is no longer the primary source of truth for queue management.
// All logic has been moved to the client-side `useQueue` hook (`src/hooks/use-queue.ts`)
// to support a full client-side "dummy" mode using Local Storage.
// This file is kept temporarily to prevent build errors from any lingering imports,
// but it is now deprecated and can be safely removed in a future cleanup.

import type { QueueState, Department, QueueUser, UserStatus, CounterState } from './types';
import { departments, counters } from './types';

// This initial state is no longer used by the application directly,
// as the `useQueue` hook now manages its own initial state.
const getInitialState = (): QueueState => {
  return departments.reduce((acc, dept) => {
    acc[dept] = {
      counters: counters[dept].reduce((counterAcc, counterName) => {
        counterAcc[counterName] = {
            queue: [],
            serving: { user: null, startedAt: null, queueNumber: null },
        };
        return counterAcc;
      }, {} as Record<string, CounterState>),
    };
    return acc;
  }, {} as QueueState);
};


export const getQueueState = (): QueueState => {
  console.warn("DEPRECATED: getQueueState is called from server-side. Use client-side useQueue hook instead.");
  return getInitialState();
};

export const addUserToQueue = (user: Omit<QueueUser, 'id' | 'joinedAt'>): QueueUser => {
  console.warn("DEPRECATED: addUserToQueue is called from server-side. Use client-side useQueue hook instead.");
  throw new Error("This function is deprecated. Use the client-side `useQueue` hook.");
};

export const callNextUser = (department: Department, counter: string): QueueUser | null => {
  console.warn("DEPRECATED: callNextUser is called from server-side. Use client-side useQueue hook instead.");
  return null;
};

export const removeUser = (userId: string): QueueUser | null => {
    console.warn("DEPRECATED: removeUser is called from server-side. Use client-side useQueue hook instead.");
    return null;
}

export const getUserStatus = (userId: string): UserStatus | null => {
    console.warn("DEPRECATED: getUserStatus is called from server-side. Use client-side useQueue hook instead.");
    return null;
};
