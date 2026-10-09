import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));

function integer(value, fallback, name, minimum, maximum) {
  const result = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return result;
}

export function loadConfig(env = process.env) {
  const port = integer(env.PORT, 3000, 'PORT', 1, 65535);
  const production = env.NODE_ENV === 'production';
  const origin = new URL(env.APP_ORIGIN || `http://localhost:${port}`);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password ||
      origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('APP_ORIGIN must be a plain http(s) origin, such as http://localhost:3000.');
  }
  if (production && origin.protocol !== 'https:') {
    throw new Error('Production requires an HTTPS APP_ORIGIN.');
  }
  return {
    port,
    host: env.HOST || '127.0.0.1',
    origin: origin.origin,
    production,
    databasePath: path.resolve(projectRoot, env.DATABASE_PATH || './data/safe-space.sqlite'),
    sessionDays: integer(env.SESSION_DAYS, 7, 'SESSION_DAYS', 1, 30),
    trustProxyHops: integer(env.TRUST_PROXY_HOPS, 0, 'TRUST_PROXY_HOPS', 0, 5),
  };
}
