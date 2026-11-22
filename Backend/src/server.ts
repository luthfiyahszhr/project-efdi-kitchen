import app from './app';
import { env } from './config/env';
import { getPool, closePool } from './config/database';

(async () => {
  try {
    await getPool();
    console.log('Connected to SQL Server');
    const server = app.listen(env.port, () =>
      console.log(`API listening on http://localhost:${env.port}/api`),
    );

    const shutdown = async () => {
      console.log('Shutting down...');
      server.close();
      await closePool();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
})();
