import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { Department } from './types';
import { departments, counters } from './types';

// Vercel has a read-only filesystem, except for the /tmp directory.
// This means the database will be ephemeral and reset on each deployment.
const DB_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'database');
const DB_PATH = path.join(DB_DIR, 'queue.db');

// Ensure the database directory exists if it's not on Vercel
if (!process.env.VERCEL) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

function initializeSchema() {
  const schema = `
    CREATE TABLE IF NOT EXISTS counters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      last_queue_number INTEGER NOT NULL DEFAULT 0,
      serving_user_id TEXT,
      serving_started_at TEXT,
      UNIQUE(name, department)
    );

    CREATE TABLE IF NOT EXISTS queue_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      department TEXT NOT NULL,
      counter_name TEXT NOT NULL,
      queue_number INTEGER NOT NULL,
      joined_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting', -- waiting, serving, served, removed
      estimated_wait_time INTEGER,
      confidence TEXT,
      FOREIGN KEY (counter_name, department) REFERENCES counters(name, department)
    );

    CREATE INDEX IF NOT EXISTS idx_queue_users_status ON queue_users(status);
    CREATE INDEX IF NOT EXISTS idx_queue_users_counter_dept ON queue_users(counter_name, department);
  `;
  db.exec(schema);
}

function seedData() {
    const insertCounter = db.prepare('INSERT OR IGNORE INTO counters (name, department) VALUES (?, ?)');
    const insertCounters = db.transaction((depts: Record<Department, string[]>) => {
        for (const dept in depts) {
            for (const counterName of depts[dept as Department]) {
                insertCounter.run(counterName, dept);
            }
        }
    });

    const countersInDb = db.prepare('SELECT COUNT(*) as count FROM counters').get() as { count: number };
    if (countersInDb.count === 0) {
        console.log('Seeding counters...');
        insertCounters(counters);
        console.log('Seeding complete.');
    }
}


// Initialize
initializeSchema();
seedData();

// Graceful shutdown
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));
