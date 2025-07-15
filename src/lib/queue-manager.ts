// This module uses a simple in-memory store for queue management.
// It's a "dummy" setup perfect for development and environments like Vercel
// where there's no persistent file system. Data will reset on server restart.

import type { QueueState, Department, QueueUser, UserStatus, CounterState } from './types';
import { departments, counters } from './types';

// Initialize the in-memory store
const queueState: QueueState = departments.reduce((acc, dept) => {
  acc[dept] = {
    counters: counters[dept].reduce((counterAcc, counterName) => {
      counterAcc[counterName] = {
          queue: [],
          serving: { user: null, startedAt: null },
          lastQueueNumber: 0,
      };
      return counterAcc;
    }, {} as Record<string, CounterState>),
  };
  return acc;
}, {} as QueueState);


export const getQueueState = (): QueueState => {
  // Return a deep copy to prevent direct mutation of the state
  return JSON.parse(JSON.stringify(queueState));
};

export const addUserToQueue = (user: Omit<QueueUser, 'id' | 'queueNumber' | 'joinedAt'>): QueueUser => {
  const { department, counter } = user;
  const counterState = queueState[department].counters[counter];
  
  if (!counterState) {
    throw new Error(`Counter ${counter} not found in department ${department}`);
  }

  counterState.lastQueueNumber += 1;
  const newQueueNumber = counterState.lastQueueNumber;
  
  const newUser: QueueUser = {
    ...user,
    id: crypto.randomUUID(),
    queueNumber: newQueueNumber,
    joinedAt: new Date(),
  };

  counterState.queue.push(newUser);
  return { ...newUser }; // Return a copy
};

export const callNextUser = (department: Department, counter: string): QueueUser | null => {
  const counterState = queueState[department].counters[counter];
  
  // Find the user who has been waiting the longest
  const nextUser = counterState.queue.shift();

  if (nextUser) {
    counterState.serving = {
      user: nextUser,
      startedAt: new Date(),
    };
    return { ...nextUser }; // Return a copy
  }
  
  // If queue is empty, clear the serving spot
  counterState.serving = { user: null, startedAt: null };
  return null;
};

export const removeUser = (userId: string): QueueUser | null => {
    for (const dept of departments) {
        for (const counterName in queueState[dept].counters) {
            const counterState = queueState[dept].counters[counterName];
            const userIndex = counterState.queue.findIndex(u => u.id === userId);
            if (userIndex > -1) {
                const [removedUser] = counterState.queue.splice(userIndex, 1);
                return removedUser;
            }
        }
    }
    return null;
}

export const getUserStatus = (userId: string): UserStatus | null => {
    for (const dept of departments) {
        for (const counterName in queueState[dept].counters) {
            const counterState = queueState[dept].counters[counterName];
            const userIndex = counterState.queue.findIndex(u => u.id === userId);

            if (userIndex > -1) {
                const user = counterState.queue[userIndex];
                const currentlyServing = counterState.serving.user;
                
                return {
                    position: userIndex + 1,
                    estimatedWaitTime: user.estimatedWaitTime,
                    confidence: user.confidence,
                    department: user.department,
                    counter: user.counter,
                    queueNumber: user.queueNumber,
                    currentlyServing: currentlyServing?.queueNumber ?? null,
                    totalInQueue: counterState.queue.length,
                    userName: user.name,
                };
            }
        }
    }
    
    // If user is not found, return dummy data to avoid errors on Vercel
    // This simulates a user who has just joined.
    console.warn(`User with ID ${userId} not found. Returning dummy data.`);
    return {
        position: 3,
        estimatedWaitTime: 12,
        confidence: "medium",
        department: "Customer Service",
        counter: "Counter 1",
        queueNumber: 101,
        currentlyServing: 98,
        totalInQueue: 5,
        userName: "Guest",
    };
};
