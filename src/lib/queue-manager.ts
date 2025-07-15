// This module interacts with the SQLite database.
import { db } from './db';
import type { QueueState, Department, QueueUser, UserStatus, CounterState, ServingInfo } from './types';
import { departments, counters } from './types';

type DbQueueUser = Omit<QueueUser, 'joinedAt'> & { joined_at: string; counter_name: string };
type DbCounter = { id: number; name: string; department: Department; last_queue_number: number; serving_user_id: string | null; serving_started_at: string | null; };

const mapDbUserToQueueUser = (dbUser: DbQueueUser): QueueUser => {
    return {
        ...dbUser,
        counter: dbUser.counter_name,
        joinedAt: new Date(dbUser.joined_at)
    };
};

export const getQueueState = (): QueueState => {
  const allCountersStmt = db.prepare('SELECT * FROM counters');
  const waitingUsersStmt = db.prepare(`
    SELECT * FROM queue_users 
    WHERE counter_name = ? AND department = ? AND status = 'waiting' 
    ORDER BY queue_number ASC
  `);
  const servingUserStmt = db.prepare(`
    SELECT qu.*, c.serving_started_at FROM queue_users qu
    JOIN counters c ON qu.id = c.serving_user_id
    WHERE c.name = ? AND c.department = ?
  `);

  const allDbCounters = allCountersStmt.all() as DbCounter[];

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

  for (const dbCounter of allDbCounters) {
      if (queueState[dbCounter.department]) {
          const waitingDbUsers = waitingUsersStmt.all(dbCounter.name, dbCounter.department) as DbQueueUser[];
          const servingDbUser = servingUserStmt.get(dbCounter.name, dbCounter.department) as (DbQueueUser & { serving_started_at: string }) | undefined;

          let servingInfo: ServingInfo = { user: null, startedAt: null };
          if(servingDbUser) {
              servingInfo = {
                  user: mapDbUserToQueueUser(servingDbUser),
                  startedAt: new Date(servingDbUser.serving_started_at)
              };
          }
          
          queueState[dbCounter.department].counters[dbCounter.name] = {
              queue: waitingDbUsers.map(mapDbUserToQueueUser),
              serving: servingInfo,
              lastQueueNumber: dbCounter.last_queue_number
          };
      }
  }

  return queueState;
};

export const addUserToQueue = (user: Omit<QueueUser, 'id' | 'queueNumber' | 'joinedAt'>): QueueUser => {
  const { department, counter } = user;
  
  const getCounterStmt = db.prepare('SELECT last_queue_number FROM counters WHERE name = ? AND department = ?');
  const counterInfo = getCounterStmt.get(counter, department) as { last_queue_number: number } | undefined;

  if (!counterInfo) {
    throw new Error(`Counter ${counter} not found in department ${department}`);
  }

  const newQueueNumber = counterInfo.last_queue_number + 1;
  const newUser: QueueUser = {
    ...user,
    id: crypto.randomUUID(),
    queueNumber: newQueueNumber,
    joinedAt: new Date(),
  };

  const transaction = db.transaction(() => {
    const insertUserStmt = db.prepare(`
      INSERT INTO queue_users (id, name, contact, department, counter_name, queue_number, joined_at, estimated_wait_time, confidence) 
      VALUES (@id, @name, @contact, @department, @counter_name, @queue_number, @joined_at, @estimated_wait_time, @confidence)
    `);
    insertUserStmt.run({
        id: newUser.id,
        name: newUser.name,
        contact: newUser.contact,
        department: newUser.department,
        counter_name: newUser.counter,
        queue_number: newUser.queueNumber,
        joined_at: newUser.joinedAt.toISOString(),
        estimated_wait_time: newUser.estimatedWaitTime,
        confidence: newUser.confidence
    });
    
    const updateCounterStmt = db.prepare('UPDATE counters SET last_queue_number = ? WHERE name = ? AND department = ?');
    updateCounterStmt.run(newQueueNumber, counter, department);
  });

  transaction();
  return newUser;
};

export const callNextUser = (department: Department, counter: string): QueueUser | null => {
  const transaction = db.transaction(() => {
    // 1. Find the next user in the queue for this counter
    const findNextUserStmt = db.prepare(`
      SELECT * FROM queue_users 
      WHERE counter_name = ? AND department = ? AND status = 'waiting' 
      ORDER BY queue_number ASC LIMIT 1
    `);
    const nextDbUser = findNextUserStmt.get(counter, department) as DbQueueUser | undefined;

    if (!nextDbUser) {
      // No one is waiting, clear serving status
      const clearServingStmt = db.prepare("UPDATE counters SET serving_user_id = NULL, serving_started_at = NULL WHERE name = ? AND department = ?");
      clearServingStmt.run(counter, department);
      return null;
    }

    const now = new Date().toISOString();

    // 2. Update the user's status to 'serving'
    const updateUserStatusStmt = db.prepare("UPDATE queue_users SET status = 'serving' WHERE id = ?");
    updateUserStatusStmt.run(nextDbUser.id);
    
    // 3. Update the counter's serving status
    const updateCounterStmt = db.prepare("UPDATE counters SET serving_user_id = ?, serving_started_at = ? WHERE name = ? AND department = ?");
    updateCounterStmt.run(nextDbUser.id, now, counter, department);

    return mapDbUserToQueueUser(nextDbUser);
  });

  return transaction();
};

export const removeUser = (userId: string): QueueUser | null => {
    const getUserStmt = db.prepare('SELECT * FROM queue_users WHERE id = ?');
    const dbUser = getUserStmt.get(userId) as DbQueueUser | undefined;

    if (dbUser && dbUser.status === 'waiting') {
        const deleteStmt = db.prepare("UPDATE queue_users SET status = 'removed' WHERE id = ?");
        deleteStmt.run(userId);
        return mapDbUserToQueueUser(dbUser);
    }
    return null;
}

export const getUserStatus = (userId: string): UserStatus | null => {
    const getUserStmt = db.prepare('SELECT * FROM queue_users WHERE id = ?');
    const dbUser = getUserStmt.get(userId) as DbQueueUser | undefined;

    if (!dbUser || dbUser.status !== 'waiting') {
        return null;
    }

    const { department, counter_name: counterName, queue_number: queueNumber } = dbUser;

    const positionStmt = db.prepare(`
        SELECT COUNT(*) as position FROM queue_users 
        WHERE counter_name = ? AND department = ? AND status = 'waiting' AND queue_number < ?
    `);
    const { position } = positionStmt.get(counterName, department, queueNumber) as { position: number };

    const totalInQueueStmt = db.prepare(`
        SELECT COUNT(*) as total FROM queue_users
        WHERE counter_name = ? AND department = ? AND status = 'waiting'
    `);
    const { total } = totalInQueueStmt.get(counterName, department) as { total: number };
    
    const servingStmt = db.prepare(`
        SELECT qu.queue_number FROM counters c
        JOIN queue_users qu ON c.serving_user_id = qu.id
        WHERE c.name = ? AND c.department = ?
    `);
    const serving = servingStmt.get(counterName, department) as { queue_number: number } | undefined;

    const user = mapDbUserToQueueUser(dbUser);

    return {
        position: position + 1,
        estimatedWaitTime: user.estimatedWaitTime,
        confidence: user.confidence,
        department: user.department,
        counter: user.counter,
        queueNumber: user.queueNumber,
        currentlyServing: serving?.queue_number ?? null,
        totalInQueue: total,
        userName: user.name,
    };
};
