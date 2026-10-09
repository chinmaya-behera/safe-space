import express from 'express';
import helmet from 'helmet';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { projectRoot } from './config.js';
import { hashPassword, verifyPassword } from './passwords.js';

export const TERMS_VERSION = '2026-10-09';
const digest = (value) => createHash('sha256').update(value).digest('hex');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const publicUser = (user) => ({
  id: user.id, name: user.name, email: user.email,
  termsVersion: user.terms_version, createdAt: user.created_at,
});

function credentials(body, registration = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (email.length > 254 || !emailPattern.test(email) ||
      password.length < (registration ? 12 : 1) || password.length > 128) return null;
  return { email, password };
}

export async function createApp({ db, config }) {
  const app = express();
  const cookieName = config.production ? '__Host-ss_session' : 'ss_session';
  const cookieOptions = {
    httpOnly: true, secure: config.production, sameSite: 'strict', path: '/',
  };
  const dummyHash = await hashPassword(randomBytes(32).toString('hex'));
  let activeHashes = 0;
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops);
  app.use(helmet({
    contentSecurityPolicy: { directives: {
      'script-src': ["'self'"],
      'connect-src': ["'self'"],
      'upgrade-insecure-requests': config.production ? [] : null,
    } },
    strictTransportSecurity: config.production ? undefined : false,
  }));

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      // A custom header and JSON prevent cross-origin form submissions. No CORS is enabled.
      if (req.get('X-Safe-Space') !== '1' || !req.is('application/json') ||
          (req.get('Origin') && req.get('Origin') !== config.origin) ||
          req.get('Sec-Fetch-Site') === 'cross-site') {
        return res.status(403).json({ error: 'Please use the Safe Space page to make this request.' });
      }
    }
    next();
  });
  app.use('/api', express.json({ limit: '8kb', strict: true }));

  function sessionToken(req) {
    const part = (req.get('Cookie') || '').split(';').map((v) => v.trim())
      .find((v) => v.startsWith(`${cookieName}=`));
    const token = part?.slice(cookieName.length + 1);
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }

  function revokeCurrent(req) {
    const token = sessionToken(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token));
  }

  function issueSession(req, res, userId) {
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    const maxAge = config.sessionDays * 86400000;
    db.exec('BEGIN IMMEDIATE');
    try {
      revokeCurrent(req);
      db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
      db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
        .run(digest(token), userId, now, now + maxAge);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    res.cookie(cookieName, token, { ...cookieOptions, maxAge });
  }

  function requireSession(req, res, next) {
    const token = sessionToken(req);
    const user = token && db.prepare(`SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?`).get(digest(token), Date.now());
    if (!user) {
      res.clearCookie(cookieName, cookieOptions);
      return res.status(401).json({ error: 'Please sign in to continue.' });
    }
    req.user = user;
    next();
  }

  function authLimiter(req, res, next) {
    const now = Date.now();
    const windowMs = 15 * 60000;
    db.prepare('DELETE FROM auth_limits WHERE expires_at <= ?').run(now);
    const buckets = [{ key: `ip:${req.ip}`, maximum: 30 }];
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email.length <= 254 && emailPattern.test(email)) buckets.push({ key: `email:${email}`, maximum: 10 });
    for (const { key, maximum } of buckets) {
      const row = db.prepare(`INSERT INTO auth_limits (bucket, attempts, expires_at) VALUES (?, 1, ?)
        ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1
        RETURNING attempts, expires_at`).get(digest(key), now + windowMs);
      if (row.attempts > maximum) {
        res.set('Retry-After', String(Math.max(1, Math.ceil((row.expires_at - now) / 1000))));
        return res.status(429).json({ error: 'Too many attempts. Please wait 15 minutes and try again.' });
      }
    }
    next();
  }

  async function withHashSlot(res, operation) {
    if (activeHashes >= 4) {
      res.set('Retry-After', '2');
      res.status(503).json({ error: 'Sign-in is busy. Please try again in a moment.' });
      return null;
    }
    activeHashes++;
    try { return await operation(); } finally { activeHashes--; }
  }

  app.get('/api/health', (req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  });

  app.get('/api/auth/config', (req, res) => {
    res.json({ termsVersion: TERMS_VERSION, passwordMinLength: 12, passwordMaxLength: 128 });
  });

  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const input = credentials(req.body, true);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!input || name.length < 2 || name.length > 40 || /[\x00-\x1f\x7f]/.test(name)) {
      return res.status(400).json({ error: 'Enter a name (2–40 characters), a valid email, and a password (12–128 characters).' });
    }
    const consent = req.body.consents;
    if (req.body.termsVersion !== TERMS_VERSION || !consent ||
        consent.peerSupport !== true || consent.emergency !== true || consent.ageAndTerms !== true) {
      return res.status(400).json({ error: 'Please accept all three statements and the current terms.' });
    }
    const passwordHash = await withHashSlot(res, () => hashPassword(input.password));
    if (passwordHash === null) return;
    const id = randomUUID();
    const now = Date.now();
    try {
      db.prepare(`INSERT INTO users (id, name, email, password_hash, terms_version, terms_accepted_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, name, input.email, passwordHash, TERMS_VERSION, now, now);
    } catch (error) {
      if (error.errcode === 2067) {
        return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      }
      throw error;
    }
    issueSession(req, res, id);
    res.status(201).json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const input = credentials(req.body);
    if (!input) return res.status(400).json({ error: 'Enter a valid email and password.' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(input.email);
    const valid = await withHashSlot(res, () => verifyPassword(input.password, user?.password_hash || dummyHash));
    if (valid === null) return;
    if (!user || !valid) return res.status(401).json({ error: 'Email or password is incorrect.' });
    issueSession(req, res, user.id);
    res.json({ user: publicUser(user) });
  });

  app.get('/api/auth/me', requireSession, (req, res) => res.json({ user: publicUser(req.user) }));

  app.post('/api/auth/logout', (req, res) => {
    revokeCurrent(req);
    res.clearCookie(cookieName, cookieOptions);
    res.status(204).end();
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  app.get(['/login', '/signup'], (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(projectRoot, 'public', 'index.html'));
  });
  app.use(express.static(path.join(projectRoot, 'public'), { dotfiles: 'deny', etag: false, maxAge: 0 }));
  app.use((req, res) => res.status(404).type('text').send('Page not found.'));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Send a valid JSON body.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
    console.error('Request failed:', error.code || 'internal_error');
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}
