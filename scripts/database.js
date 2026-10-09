import { mkdirSync } from 'node:fs';
import { backup } from 'node:sqlite';
import path from 'node:path';
import { loadConfig, projectRoot } from '../src/config.js';
import { openDatabase } from '../src/database.js';

const action = process.argv[2] || 'status';
if (!['init', 'status', 'backup'].includes(action)) throw new Error('Use init, status, or backup.');
const config = loadConfig();
const db = openDatabase(config.databasePath);
try {
  if (action === 'backup') {
    const directory = path.join(projectRoot, 'backups');
    mkdirSync(directory, { recursive: true });
    const destination = path.join(directory, `safe-space-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
    await backup(db, destination);
    console.log(`Database backup saved: ${destination}`);
  } else {
    const users = db.prepare('SELECT count(*) AS count FROM users').get().count;
    const sessions = db.prepare('SELECT count(*) AS count FROM sessions WHERE expires_at > ?').get(Date.now()).count;
    const version = db.prepare('PRAGMA user_version').get().user_version;
    console.log(`Database: ${config.databasePath}`);
    console.log(`Schema version: ${version}; accounts: ${users}; active sessions: ${sessions}`);
  }
} finally {
  db.close();
}
