# Safe Space

A working login backend connected to the supplied Safe Space page. Built with Node.js 24, Express and SQLite. The original HTML file is untouched; the connected copy lives in `public/`.

## Run it on Windows

Open PowerShell in this folder:

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run db:init
npm.cmd start
```

Visit **http://localhost:3000**, select **Create account**, enter a name, email and password, and accept the three statements. After that, use **Sign in**. Press Ctrl+C in the terminal to stop the server. Open the page through the server URL; double-clicking `index.html` will not connect to the backend.

Node.js 24 is required. This project uses the SQLite module bundled with Node 24; that release can print an experimental-module warning.

## Database configuration

Your database is a file at `data/safe-space.sqlite`. The app creates its directory, tables and indexes automatically. No database account, separate installation, password or connection URL is needed.

The `.env` file lets you change the database location, port, site origin and session lifetime. For example, when changing `PORT` to `3001`, also change `APP_ORIGIN` to `http://localhost:3001`. Keep `.env`, the database, and backups out of Git. See [the database guide](docs/DATABASE.md) for inspection, backups and moving the file.

```powershell
npm.cmd run db:status
npm.cmd run db:backup
```

## What is included

- Account creation with server-side validation and a dated consent record.
- Email and password sign-in, with salted scrypt password hashes.
- Random sessions in HttpOnly, SameSite cookies; the database stores token hashes. Sessions expire after seven days by default, survive restarts, rotate on sign-in and are revoked on sign-out.
- Persistent throttling by email and client address, request size limits, same-origin request protection, parameterized SQL and security headers.
- Account-specific browser storage for the existing journal, contacts and coping plans. Switching accounts clears the previous account's data from the visible page and chat memory.
- Automated authentication tests: run `npm.cmd test`.

The database stores accounts, consent and sessions. Journal entries, contacts and coping plans remain in browser storage and are **not encrypted or synced**. Browser storage isolation prevents ordinary account switching from showing another account's entries; anyone with access to the browser profile can still inspect them. Old unscoped browser entries from the supplied demo are not automatically assigned to a new account.

Email verification and password recovery are not included. Email is an account identifier, not proof of mailbox ownership. The supplied chatbot uses a host-specific AI integration; in a normal browser it continues to use its existing fallback replies.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Database connectivity check |
| GET | `/api/auth/config` | Current terms version and password lengths |
| POST | `/api/auth/register` | Create an account and start a session |
| POST | `/api/auth/login` | Sign in and rotate the current session |
| GET | `/api/auth/me` | Get the signed-in account; returns 401 otherwise |
| POST | `/api/auth/logout` | Revoke the current session and clear its cookie |

POST requests require `Content-Type: application/json` and `X-Safe-Space: 1`. Browser requests must come from `APP_ORIGIN`. The page handles these headers and cookies automatically.

Registration body:

```json
{
  "name": "Alex",
  "email": "alex@example.com",
  "password": "your own long unique passphrase",
  "termsVersion": "2026-10-09",
  "consents": { "peerSupport": true, "emergency": true, "ageAndTerms": true }
}
```

## Git repository

This folder is a standalone Git repository. Database files and local settings are ignored. If GitHub is not connected yet, sign in interactively and create a private repository:

```powershell
gh auth login --hostname github.com --web --git-protocol https
gh repo create safe-space --private --source . --remote origin --push
```

Choose a different unused repository name if `safe-space` already exists. Do not paste GitHub tokens into the page, source code or this chat.

## Hosting later

Use a Node 24 server with a persistent disk for SQLite. Configure `NODE_ENV=production`, an HTTPS `APP_ORIGIN`, and `DATABASE_PATH` on that disk. If a trusted reverse proxy is the only public entry point, set `TRUST_PROXY_HOPS` to its exact hop count and configure `HOST` for your host. Serve the UI and API under the same origin. Regularly back up the database and restrict access to its directory.

An ephemeral/serverless filesystem cannot preserve this local SQLite file. Use a persistent host or adapt the database layer to a hosted database before deploying there. This project is ready for local use; email verification, recovery and a hosting-specific setup are further work before a public launch.

Implementation references: [Node 24 SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html), [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Express](https://expressjs.com/en/5x/api/) and [Helmet](https://helmetjs.github.io/).
