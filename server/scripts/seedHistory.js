/**
 * Historical telemetry backfill seeder for MSSMS.
 *
 * Generates realistic mock readings for every active station going back
 * N days at a fixed interval, validates each reading, and bulk-inserts them
 * into MongoDB so trend charts and CSV reports have rich data immediately.
 *
 * Usage: node scripts/seedHistory.js [--days=7] [--interval=10]
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Station from '../models/Station.js';
import Reading from '../models/Reading.js';
import { validateReading } from '../services/validatorService.js';
import { generateHistoricalReadings } from '../services/simulatorService.js';

const DEFAULT_DAYS = 7;
const DEFAULT_INTERVAL_MINUTES = 10;
const BATCH_SIZE = 500;

function parseArgs(argv) {
  const args = { days: DEFAULT_DAYS, intervalMinutes: DEFAULT_INTERVAL_MINUTES };
  for (const arg of argv) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) {
      const [, key, value] = match;
      if (key === 'days') args.days = Number(value);
      if (key === 'intervalMinutes') args.intervalMinutes = Number(value);
    }
  }
  return args;
}

function progressBar(current, total, width = 30) {
  const ratio = Math.min(Math.max(current / total, 0), 1);
  const filled = Math.floor(ratio * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  const pct = (ratio * 100).toFixed(0);
  process.stdout.write(`\r  [${bar}] ${pct}% (${current}/${total})`);
}

async function seedHistory({ days, intervalMinutes }) {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mssms');

  const stations = await Station.find({ status: 'Active' }).lean();
  if (stations.length === 0) {
    console.log('[SEED-HISTORY] No active stations found. Run `npm run seed` first.');
    await mongoose.disconnect();
    return;
  }

  console.log(`[SEED-HISTORY] Generating ${days} days of history @ ${intervalMinutes}m intervals for ${stations.length} stations...`);

  let grandTotal = 0;

  for (let s = 0; s < stations.length; s++) {
    const station = stations[s];
    const readings = generateHistoricalReadings(station, { days, intervalMinutes });

    // Validate and tag isValid per validatorService rules
    const validReadings = readings.map((reading) => {
      const validation = validateReading(reading);
      return { ...reading, isValid: validation.isValid };
    });

    // Bulk insert in chunks
    let inserted = 0;
    for (let i = 0; i < validReadings.length; i += BATCH_SIZE) {
      const chunk = validReadings.slice(i, i + BATCH_SIZE);
      await Reading.insertMany(chunk, { ordered: false });
      inserted += chunk.length;
      progressBar(inserted, validReadings.length);
    }
    console.log(''); // newline after progress bar
    grandTotal += inserted;

    const latest = validReadings[0];
    console.log(
      `[SEED-HISTORY] ${station.name}: ${inserted} readings inserted ` +
      `(latest: ${latest.temperature}°C / ${latest.humidity}% / ${latest.windSpeed} m/s / ${latest.pressure} hPa)`,
    );
  }

  await mongoose.disconnect();
  console.log(`[SEED-HISTORY] Complete. ${grandTotal} total readings inserted. Disconnected from MongoDB.`);
}

const args = parseArgs(process.argv.slice(2));

seedHistory(args).catch((error) => {
  console.error('[SEED-HISTORY] Failed:', error.message);
  process.exitCode = 1;
});
