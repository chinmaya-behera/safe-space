import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename, { timeout: 5000 });
  try {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    const version = db.prepare('PRAGMA user_version').get().user_version;
    if (version > 1) throw new Error('This database needs a newer application version.');
    if (version < 1) {
      db.exec('BEGIN IMMEDIATE');
      try {
        db.exec(readFileSync(new URL('../db/001-auth.sql', import.meta.url), 'utf8'));
        db.exec('PRAGMA user_version = 1; COMMIT;');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
    db.prepare('DELETE FROM auth_limits WHERE expires_at <= ?').run(Date.now());
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
