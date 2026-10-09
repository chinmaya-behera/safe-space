import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './database.js';

const config = loadConfig();
const db = openDatabase(config.databasePath);
const app = await createApp({ db, config });
const server = app.listen(config.port, config.host, () => {
  console.log(`Safe Space is ready at ${config.origin}`);
  console.log(`SQLite database: ${config.databasePath}`);
});
server.on('error', (error) => {
  console.error(`Could not start Safe Space: ${error.message}`);
  db.close();
  process.exitCode = 1;
});
const cleanup = setInterval(() => {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
  db.prepare('DELETE FROM auth_limits WHERE expires_at <= ?').run(Date.now());
}, 15 * 60000);
cleanup.unref();
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    clearInterval(cleanup);
    server.close(() => { db.close(); });
  });
}
