
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { QueueState, Department, QueueUser, UserStatus, CounterState } from '@/lib/types';
import { departments, counters } from '@/lib/types';
import { sendQueueConfirmationEmail } from '@/lib/email';

const isBrowser = typeof window !== 'undefined';

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

export const useQueue = () => {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  
  // Load state from localStorage on mount
  useEffect(() => {
    if (!isBrowser) return;
    
    try {
      const storedState = localStorage.getItem('queueState');
      if (storedState) {
        // Parse and revive Date objects
        const parsedState = JSON.parse(storedState, (key, value) => {
          if (key === 'joinedAt' || key === 'startedAt') {
            return value ? new Date(value) : null;
          }
          return value;
        });
        setQueueState(parsedState);
      } else {
        setQueueState(getInitialState());
      }
    } catch (error) {
      console.error("Failed to parse queue state from localStorage", error);
      setQueueState(getInitialState());
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isBrowser && queueState) {
      try {
        localStorage.setItem('queueState', JSON.stringify(queueState));
      } catch (error) {
        console.error("Failed to save queue state to localStorage", error);
      }
    }
  }, [queueState]);

  // Listen for changes from other tabs
  useEffect(() => {
    if (!isBrowser) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'queueState' && event.newValue) {
        try {
          const parsedState = JSON.parse(event.newValue, (key, value) => {
            if (key === 'joinedAt' || key === 'startedAt') {
              return value ? new Date(value) : null;
            }
            return value;
          });
          setQueueState(parsedState);
        } catch (error) {
           console.error("Failed to parse queue state from storage event", error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updateState = (newState: QueueState) => {
    setQueueState(newState);
    // Also update localStorage immediately to ensure cross-tab sync
    if (isBrowser) {
        localStorage.setItem('queueState', JSON.stringify(newState));
    }
  };

  const addUserToQueue = useCallback((user: Omit<QueueUser, 'id' |'joinedAt'>): QueueUser => {
    if (!queueState) throw new Error("Queue state not initialized");

    const newState = JSON.parse(JSON.stringify(queueState)); // Deep copy
    const { department, counter } = user;
    const counterState = newState[department].counters[counter];
    
    const newUser: QueueUser = {
      ...user,
      id: crypto.randomUUID(),
      joinedAt: new Date(),
    };
  
    counterState.queue.push(newUser);

    const position = counterState.queue.length; // Their position will be the new length
    
    updateState(newState);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const statusLink = `${appUrl}/queue/${newUser.id}`;
    
    // Pass the position (as queueNumber) for the email and initial status page view
    const emailUserPayload = { ...newUser, queueNumber: position };
    sendQueueConfirmationEmail(emailUserPayload, statusLink);

    return emailUserPayload; // Return user with queueNumber for the success modal
  }, [queueState]);

  const callNextUser = useCallback((department: Department, counter: string): QueueUser | null => {
    if (!queueState) return null;

    const newState = JSON.parse(JSON.stringify(queueState)); // Deep copy
    const counterState = newState[department].counters[counter];
    
    const lastServingNumber = counterState.serving.queueNumber || 0;
    const nextUser = counterState.queue.shift();
  
    if (nextUser) {
      counterState.serving = {
        user: nextUser,
        startedAt: new Date(),
        queueNumber: lastServingNumber + 1, // This can be a simple ticket number now
      };
    } else {
      counterState.serving = { user: null, startedAt: null, queueNumber: counterState.serving.queueNumber };
    }

    updateState(newState);
    return nextUser ? { ...nextUser, queueNumber: counterState.serving.queueNumber! } : null;
  }, [queueState]);

  const removeUser = useCallback((userId: string): QueueUser | null => {
    if (!queueState) return null;

    const newState = JSON.parse(JSON.stringify(queueState));
    let removedUser: QueueUser | null = null;
    
    for (const dept of departments) {
      for (const counterName in newState[dept].counters) {
        const counterState = newState[dept].counters[counterName];
        const userIndex = counterState.queue.findIndex((u: QueueUser) => u.id === userId);
        if (userIndex > -1) {
          [removedUser] = counterState.queue.splice(userIndex, 1);
          updateState(newState);
          return removedUser;
        }
      }
    }
    return null;
  }, [queueState]);

  const getUserStatus = useCallback((userId: string): UserStatus | null => {
    if (!queueState) return null;

    for (const dept of departments) {
        for (const counterName in queueState[dept].counters) {
            const counterState = queueState[dept].counters[counterName];
            const userIndex = counterState.queue.findIndex((u: QueueUser) => u.id === userId);

            if (userIndex > -1) {
                const user = counterState.queue[userIndex];
                const currentlyServing = counterState.serving;
                
                return {
                    position: userIndex + 1, // Position is index + 1
                    estimatedWaitTime: user.estimatedWaitTime,
                    confidence: user.confidence,
                    department: user.department,
                    counter: user.counter,
                    currentlyServing: currentlyServing?.queueNumber ?? null,
                    totalInQueue: counterState.queue.length,
                    userName: user.name,
                };
            }
        }
    }
    return null; // User not found
  }, [queueState]);

  const getQueueStats = useCallback(() => {
    if (!queueState) {
        return { totalWaiting: 0, averageWaitTime: 0 };
    }

    let totalWaiting = 0;
    let totalWaitTime = 0;
    
    for (const dept of departments) {
        for (const counterName in queueState[dept].counters) {
            const counterState = queueState[dept].counters[counterName];
            totalWaiting += counterState.queue.length;
            counterState.queue.forEach(user => {
                totalWaitTime += user.estimatedWaitTime ?? 0;
            });
        }
    }

    const averageWaitTime = totalWaiting > 0 ? totalWaitTime / totalWaiting : 0;
    
    return { totalWaiting, averageWaitTime };
  }, [queueState]);


  return { queueState, addUserToQueue, callNextUser, removeUser, getUserStatus, getQueueStats };
};
