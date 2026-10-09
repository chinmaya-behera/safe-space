# Configure and maintain the SQLite database

## First setup

1. Copy `.env.example` to `.env` in the project folder.
2. Keep `DATABASE_PATH=./data/safe-space.sqlite` for the default local setup.
3. Run `npm.cmd run db:init`. This creates the database and applies schema version 1.
4. Run `npm.cmd start` and create your account at http://localhost:3000.
5. Run `npm.cmd run db:status` to see account/session counts without displaying private account data.

Starting the app also applies any required schema setup. Re-running initialization preserves existing accounts.

## Stored data

| Table | Contents |
| --- | --- |
| `users` | UUID, name, normalized unique email, salted password hash, terms version, consent time, creation time |
| `sessions` | SHA-256 hash of random token, account ID, creation time, expiration time |
| `auth_limits` | Hashed rate-limit bucket, attempt count and window expiration |

Sessions reference accounts with foreign keys. Expired sessions and rate-limit records are cleaned periodically. Passwords and raw session tokens are never stored in the database. The file itself is not encrypted. Restrict access to the computer/directory and keep backups private.

## Inspect it

Open `data/safe-space.sqlite` in a SQLite database viewer. An external viewer is optional; the app includes all database functionality it needs. A safe account overview query is:

```sql
SELECT id, name, email, terms_version,
       datetime(created_at / 1000, 'unixepoch') AS created_utc
FROM users;
```

Timestamps are milliseconds since the Unix epoch. Never share query results containing account emails, password hashes or session records.

## Backups

Run `npm.cmd run db:backup`. It creates a consistent timestamped snapshot in `backups/`, including committed writes from SQLite's write-ahead log. It works while the app is running. Save backups somewhere private and separate from the working computer.

To restore a snapshot, stop the server and any database viewers, preserve the current database together with any `-wal` and `-shm` files in a separate private directory, then place the selected snapshot at the path configured by `DATABASE_PATH`. Restart the app and run `db:status`. Do not leave sidecar files from another database beside the restored file. Sessions that were still valid when the backup was taken can be valid again after a restore; revoke them with `DELETE FROM sessions;` in a database viewer if you need everyone to sign in again.

## Change location

The most direct way is to run `db:backup`, stop the app, copy that snapshot to the new location, then set `.env`, for example:

```dotenv
DATABASE_PATH=E:/private-safe-space/safe-space.sqlite
```

Use forward slashes in Windows environment paths. Restart and check `db:status`. A new empty path creates a new empty database, so existing accounts will not appear unless you copy a snapshot there.

## Troubleshooting

- **Database is locked:** close any database viewer with an uncommitted transaction and retry. The app waits up to five seconds for locks.
- **Cannot open database:** ensure the directory is writable and `DATABASE_PATH` points to a file.
- **Sign-in returns too many attempts:** wait up to 15 minutes. Limits survive app restarts.
- **Page rejects requests after a port/domain change:** make `APP_ORIGIN` match the exact browser origin and restart.
- **An account is missing:** check the configured database path and the database status.

Keep the database on a local persistent disk. Do not share one SQLite file between multiple machines over a network filesystem.
