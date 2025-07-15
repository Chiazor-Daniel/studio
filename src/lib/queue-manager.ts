// This is a server-only module to simulate a database.
import type { QueueState, Department, QueueUser, UserStatus } from './types';
import { departments } from './types';

// In-memory store
const queueStore: QueueState = departments.reduce((acc, dept) => {
  acc[dept] = {
    queue: [],
    serving: { user: null, startedAt: null },
    lastQueueNumber: 0,
  };
  return acc;
}, {} as QueueState);

export const getQueueState = (): QueueState => {
  return JSON.parse(JSON.stringify(queueStore));
};

export const addUserToQueue = (user: Omit<QueueUser, 'id' | 'queueNumber' | 'joinedAt'>): QueueUser => {
  const departmentState = queueStore[user.department];
  departmentState.lastQueueNumber += 1;
  
  const newUser: QueueUser = {
    ...user,
    id: crypto.randomUUID(),
    queueNumber: departmentState.lastQueueNumber,
    joinedAt: new Date(),
  };

  departmentState.queue.push(newUser);
  return newUser;
};

export const callNextUser = (department: Department): QueueUser | null => {
  const departmentState = queueStore[department];
  if (departmentState.queue.length > 0) {
    const nextUser = departmentState.queue.shift();
    if(nextUser) {
        departmentState.serving.user = nextUser;
        departmentState.serving.startedAt = new Date();
        return nextUser;
    }
  }
  departmentState.serving.user = null;
  departmentState.serving.startedAt = null;
  return null;
};

export const removeUser = (userId: string): QueueUser | null => {
    for (const dept of departments) {
        const departmentState = queueStore[dept];
        const userIndex = departmentState.queue.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            const [removedUser] = departmentState.queue.splice(userIndex, 1);
            return removedUser;
        }
    }
    return null;
}


export const getUserStatus = (userId: string): UserStatus | null => {
  for (const dept of departments) {
    const departmentState = queueStore[dept];
    const userIndex = departmentState.queue.findIndex(u => u.id === userId);

    if (userIndex !== -1) {
      const user = departmentState.queue[userIndex];
      return {
        position: userIndex + 1,
        estimatedWaitTime: user.estimatedWaitTime,
        confidence: user.confidence,
        department: user.department,
        queueNumber: user.queueNumber,
        currentlyServing: departmentState.serving.user?.queueNumber ?? null,
        totalInQueue: departmentState.queue.length,
        userName: user.name,
      };
    }
  }
  return null;
};
