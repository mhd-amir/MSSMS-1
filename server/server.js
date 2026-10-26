import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import stations from './routes/stations.js';
import readings from './routes/readings.js';
import sensors from './routes/sensors.js';
import maintenance from './routes/maintenance.js';
import alerts from './routes/alerts.js';
import reports from './routes/reports.js';
import auth from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';
import { startIngestionJob, runIngestionCycle } from './jobs/ingestionJob.js';
import { startSimulatorJob, runSimulationCycle } from './jobs/simulatorJob.js';
import simulation from './routes/simulation.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',').map((origin) => origin.trim()) || true }));
app.use(express.json({ limit: '100kb' }));

// Cache one Mongo connection across warm serverless invocations.
let connectionPromise;
async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (mongoose.connection.readyState === 0) connectionPromise = undefined;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }
  await connectionPromise;
}

async function ensureDatabase(_req, res, next) {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('[database] Connection failed:', error.message);
    res.status(503).json({ error: 'Database unavailable' });
  }
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.use('/api', ensureDatabase);
app.use('/api/auth', auth);

// Vercel Cron calls this GET endpoint in production. Keep it independent from
// user JWT auth and require the dedicated CRON_SECRET bearer token.
app.get('/api/internal/cron/ingest', async (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  const supplied = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!secret || !supplied || supplied.length !== secret.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    if ((process.env.DATA_SOURCE || 'OPEN_METEO') === 'SIMULATOR') await runSimulationCycle();
    else await runIngestionCycle();
    return res.json({ status: 'ok', completedAt: new Date().toISOString() });
  } catch (error) { return next(error); }
});

app.use('/api', requireAuth);
app.use('/api/stations', stations);
app.use('/api/readings', readings);
app.use('/api/sensors', sensors);
app.use('/api/maintenance', maintenance);
app.use('/api/alerts', alerts);
app.use('/api/reports', reports);
app.use('/api/simulation', simulation);
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error('[api]', err);
  if (err instanceof mongoose.Error.ValidationError) return res.status(400).json({ error: 'Validation failed', details: Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message])) });
  return res.status(500).json({ error: 'Internal server error' });
});

// Vercel imports the default export as a serverless Express function. For local
// development, retain the regular listener and node-cron scheduler.
export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 5000;
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
    await connectToDatabase();
    const dataSource = process.env.DATA_SOURCE || 'OPEN_METEO';
    if (dataSource === 'SIMULATOR') {
      startSimulatorJob();
      if (process.env.INGEST_ON_START === 'true') runSimulationCycle().catch((e) => console.error('[simulator] Startup cycle failed:', e));
    } else {
      startIngestionJob();
      if (process.env.INGEST_ON_START === 'true') runIngestionCycle().catch((e) => console.error('[ingestion] Startup cycle failed:', e));
    }
    app.listen(port, () => console.info(`MSSMS API listening on port ${port} (DATA_SOURCE=${dataSource})`));
  } catch (error) {
    console.error('Unable to start MSSMS server:', error.message);
    process.exitCode = 1;
  }
}
