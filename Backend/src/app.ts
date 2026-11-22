import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { getPool } from './config/database';
import { swaggerSpec } from './config/swagger';
import {
  createSession,
  findSession,
  readSessionCookie,
  rotateCsrfToken,
  setSessionCookie,
} from './services/session.service';
import { loadSession, requireCsrf } from './middlewares/session';
import { ok } from './utils/response';
import routes from './routes';
import { notFound, errorHandler } from './middlewares/errorHandler';
import swaggerUi from 'swagger-ui-express';
import { serveProductImage } from './controllers/tsd-public.controller';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv !== 'test') app.use(morgan('dev'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/media/produk/:id_produk', serveProductImage);

app.get('/health', async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS connected');
    res.json({ ok: true, database: 'connected', ts: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});
app.get('/csrf', async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const session = await findSession(readSessionCookie(req.headers.cookie));
    if (session) {
      const csrfToken = await rotateCsrfToken(session.id);
      setSessionCookie(res, session.id);
      res.setHeader('X-CSRF-Token', csrfToken);
      return ok(res, { csrf_token: csrfToken });
    }

    const created = await createSession(null);
    setSessionCookie(res, created.id);
    res.setHeader('X-CSRF-Token', created.csrfToken);
    return ok(res, { csrf_token: created.csrfToken });
  } catch (error) {
    next(error);
  }
});
app.use('/api', loadSession, requireCsrf, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
