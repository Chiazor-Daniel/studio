// This is a server-only module to simulate a database.
import type { QueueState, Department, QueueUser, UserStatus, CounterState } from './types';
import { departments, counters } from './types';

// In-memory store
const queueStore: QueueState = departments.reduce((acc, dept) => {
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
  return JSON.parse(JSON.stringify(queueStore));
};

export const addUserToQueue = (user: Omit<QueueUser, 'id' | 'queueNumber' | 'joinedAt'>): QueueUser => {
  const { department, counter } = user;
  const counterState = queueStore[department].counters[counter];
  
  if (!counterState) {
    throw new Error(`Counter ${counter} not found in department ${department}`);
  }

  counterState.lastQueueNumber += 1;
  
  const newUser: QueueUser = {
    ...user,
    id: crypto.randomUUID(),
    queueNumber: counterState.lastQueueNumber,
    joinedAt: new Date(),
  };

  counterState.queue.push(newUser);
  return newUser;
};

export const callNextUser = (department: Department, counter: string): QueueUser | null => {
  const counterState = queueStore[department].counters[counter];
  
  if (!counterState) {
      console.warn(`Attempted to call next user for non-existent counter: ${counter} in ${department}`);
      return null;
  }

  if (counterState.queue.length > 0) {
    const nextUser = counterState.queue.shift();
    if(nextUser) {
        counterState.serving.user = nextUser;
        counterState.serving.startedAt = new Date();
        return nextUser;
    }
  }
  counterState.serving.user = null;
  counterState.serving.startedAt = null;
  return null;
};

export const removeUser = (userId: string): QueueUser | null => {
    for (const dept of departments) {
        const departmentState = queueStore[dept];
        for(const counterName in departmentState.counters) {
            const counterState = departmentState.counters[counterName];
            const userIndex = counterState.queue.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                const [removedUser] = counterState.queue.splice(userIndex, 1);
                return removedUser;
            }
        }
    }
    return null;
}

export const getUserStatus = (userId: string): UserStatus | null => {
  for (const dept of departments) {
    const departmentState = queueStore[dept];
    for (const counterName in departmentState.counters) {
        const counterState = departmentState.counters[counterName];
        const userIndex = counterState.queue.findIndex(u => u.id === userId);

        if (userIndex !== -1) {
          const user = counterState.queue[userIndex];
          return {
            position: userIndex + 1,
            estimatedWaitTime: user.estimatedWaitTime,
            confidence: user.confidence,
            department: user.department,
            counter: user.counter,
            queueNumber: user.queueNumber,
            currentlyServing: counterState.serving.user?.queueNumber ?? null,
            totalInQueue: counterState.queue.length,
            userName: user.name,
          };
        }
    }
  }
  return null;
};
