import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { connectDB } from './config/db';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';
import { TimeEntry } from './models/TimeEntry';
import { User } from './models/User';
import { initSocket } from './socket';
import { syncAllConnectedUsers } from './services/clickupEntrySync';

async function backfillLegacyEntrySource(): Promise<void> {
  try {
    const result = await TimeEntry.updateMany(
      { $or: [{ source: { $exists: false } }, { source: null }] },
      { $set: { source: 'tracker' } },
    );
    if (result.modifiedCount > 0) {
      console.log(
        `[api] backfilled ${result.modifiedCount} legacy time entries with source='tracker'`,
      );
    }
  } catch (err) {
    console.error('[api] entry source backfill failed', err);
  }
}

async function migrateManagerRoleToAdmin(): Promise<void> {
  try {
    const result = await User.updateMany(
      { role: 'manager' },
      { $set: { role: 'admin' } },
    );
    if (result.modifiedCount > 0) {
      console.log(
        `[api] migrated ${result.modifiedCount} legacy 'manager' users to 'admin'`,
      );
    }
  } catch (err) {
    console.error('[api] manager-role migration failed', err);
  }
}

async function start(): Promise<void> {
  await connectDB();
  await backfillLegacyEntrySource();
  await migrateManagerRoleToAdmin();

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use('/', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
    console.log(`[api] socket.io ready`);
  });

  startClickupEntryPoll();
}

function startClickupEntryPoll(): void {
  const minutes = env.CLICKUP_ENTRY_POLL_MIN;
  if (!minutes || minutes <= 0) {
    console.log('[clickup-poll] disabled');
    return;
  }
  const ms = minutes * 60 * 1000;
  console.log(`[clickup-poll] running every ${minutes} min (webhook-backstop)`);
  const tick = () => {
    syncAllConnectedUsers().catch((err) =>
      console.error('[clickup-poll] tick failed', err),
    );
  };
  setTimeout(tick, 60 * 1000);
  setInterval(tick, ms);
}

start().catch((err) => {
  console.error('[api] failed to start', err);
  process.exit(1);
});
