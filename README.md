# Safe Space

A working login backend connected to the supplied Safe Space page. Built with Node.js 24, Express and SQLite, with React, TypeScript and Tailwind support for the login, journal and animated chat screens. The original HTML file is untouched; the connected copy lives in `public/`.

## Run it on Windows

Open PowerShell in this folder:

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run db:init
npm.cmd start
```

Visit **http://localhost:3000**, select **Create an account**, enter a name, email and password, and accept the three statements. After that, use **Sign in**. You can open **http://localhost:3000/login** or **/signup** directly to view either form, including while another tab is signed in. Press Ctrl+C in the terminal to stop the server. Open the page through the server URL; double-clicking `index.html` will not connect to the backend.

`npm.cmd start` builds the React screens automatically. Use `npm.cmd run dev` while editing to rebuild the React screens and restart the backend when files change; refresh the page after editing. To check TypeScript and build without starting the server, use `npm.cmd run build`.

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
- Automated authentication, journal storage and chat session tests: run `npm.cmd test`.

## Chat screen

Open **http://localhost:3000/#chat** after signing in. The supplied animated chat design is adapted for Safe Space in `components/ui/animated-ai-chat.tsx`: a dark glass composer, soft violet glow, animated conversation starters, message transitions, an expanding textarea and a support command menu. Animations respect reduced-motion preferences.

Enter sends a message; Shift + Enter starts a new line. A suggested starter fills the composer so you can edit it before sending. Select **Shortcuts** or type `/` to open the menu, then use the arrow keys and Enter, or click a choice. `/breathe` and `/ground` open the existing coping exercises, `/journal` opens your journal, and `/help` opens Help Now. The send button also runs a selected slash command.

Conversations and unfinished chat drafts survive navigation during the current page session. They are cleared on sign-out or account changes, and are not stored in SQLite or browser storage. The existing host AI integration can stream replies when available. In a normal browser without that integration, the page clearly labels the existing guided fallback replies. Pending replies have a typing indicator and a timeout; late replies from a previous account are ignored. Risk phrases still show the original support notice with tappable emergency and support numbers.

The design reference's command examples are adapted to the actual support tools. Attachment uploads and design-generation actions are outside this integration. Local checks cover message sending, multiline input, mobile layout and shortcut navigation; automated tests exercise streaming with a mock provider, fallback replies, timeout recovery and account isolation.

## Help Now

Help Now, the helpline directory and trusted contacts share the coping library's monochrome charcoal-and-gray theme. A prominent support button opens all existing helplines and saved contacts; the home screen also offers direct emergency and Tele-MANAS call links. The directory keeps trusted-person call/text links, safety guidance and a breathing guide. Contact fields have accessible labels, and the layout adapts to mobile screens and reduced-motion preferences. Existing account-specific contacts stay in the same browser storage.

## Coping library

Open **http://localhost:3000/#coping** after signing in. The library and all eight exercises use a monochrome charcoal-and-gray palette, rounded cards, outline icons and restrained motion to match the chat and journal layouts. The toolkit adapts to small screens; grounding and body-release exercises show step progress, and breathing keeps its expanding guide. Keyboard focus is visible and animations respect reduced-motion preferences.

Breathing, grounding, the 15-minute timer, safety guidance, reaching out, body release, kind words and the saved coping plan keep their existing behavior. Coping plans remain in the same account-specific browser storage. Chat shortcuts still open breathing and grounding directly.

## Journal screen

Open **http://localhost:3000/#journal** after signing in. The journal has a calm paper-style layout with animated mood choices, seven rotating prompts, lined writing space, a word count, a gratitude field and an entry archive. Use the moon/sun button beside the view tabs to switch between light and dark mode. Your choice is remembered for this account in this browser; the initial setting follows the app/device theme. The draggable scroll marker tracks your reading position; hover or focus the numbered shortcuts for floating section previews, and click them to jump between sections. Animations respect your device's reduced-motion setting.

The scroll interaction is an original implementation inspired by [Skiper UI's Anime js scrollbar](https://skiper-ui.com/v1/skiper1). It uses React, CSS transitions and browser observers; no Pro component source or additional animation dependency is required.

Existing account-specific journal entries keep their original text, dates and moods. Delete moves an entry to **Recently deleted**, where it stays until restored. A blocked browser-storage write preserves your unsaved words. Drafts survive navigation during the current page session; saving is still required before refreshing or closing the page. Journal data remains in this browser, separate from the SQLite account database.

## Login component

The supplied dark glass-card design is integrated in `components/ui/modern-stunning-sign-in.tsx` and branded for Safe Space. It uses the real backend instead of a demo alert, and includes a matching registration form, accessible labels, keyboard submission, a password visibility toggle and loading/error states. Google sign-in and social-proof counts are omitted because no Google provider or verified user counts are configured.

The shadcn-compatible `components.json`, `@/` alias, `lib/utils.ts`, TypeScript configuration and Tailwind Vite plugin are already configured. Shared UI components belong in `components/ui/`; keeping this path consistent lets imported components and the shadcn CLI resolve the same aliases. Login styles are in `frontend/styles.css`. Tailwind's global reset is omitted to preserve the existing support screens. See [frontend setup details](docs/FRONTEND.md).

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
