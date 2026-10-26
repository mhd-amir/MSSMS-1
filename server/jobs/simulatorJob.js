/**
 * Simulator ingestion job for MSSMS.
 *
 * Alternative to ingestionJob.js: instead of calling the Open-Meteo API, it
 * generates telemetry via simulatorService.js for every active station on a
 * cron schedule. Controlled by the DATA_SOURCE environment variable:
 *
 *   DATA_SOURCE=OPEN_METEO   -> use ingestionJob.js (default)
 *   DATA_SOURCE=SIMULATOR    -> use this simulator job
 */

import cron from 'node-cron';
import Station from '../models/Station.js';
import Reading from '../models/Reading.js';
import { validateReading } from '../services/validatorService.js';
import { evaluateReading } from '../services/alertEngine.js';
import { generateReading } from '../services/simulatorService.js';

/** Run one simulation cycle: one simulated reading per active station. */
export async function runSimulationCycle() {
  const stations = await Station.find({ status: 'Active' });
  for (const station of stations) {
    try {
      const { reading } = generateReading(station, { mode: 'NORMAL' });
      const validation = validateReading(reading);
      const doc = await Reading.create({ ...reading, isValid: validation.isValid });
      await evaluateReading(station, doc);
      console.info(
        `[SIMULATOR] ${station.name}: ${doc.temperature}°C / ${doc.humidity}% / ` +
          `${doc.windSpeed} m/s / ${doc.pressure} hPa (isValid: ${validation.isValid})`,
      );
    } catch (error) {
      console.error(`[SIMULATOR] ${station.name}: ${error.message}`);
    }
  }
}

/**
 * Start the simulator cron job.
 *
 * @param {string} expression - Cron expression (defaults to every 10 minutes unless SIMULATOR_CRON is set)
 * @returns {object} The cron job instance
 */
export function startSimulatorJob(expression = process.env.SIMULATOR_CRON || '*/10 * * * *') {
  if (!cron.validate(expression)) {
    throw new Error(`Invalid SIMULATOR_CRON expression: ${expression}`);
  }
  const job = cron.schedule(expression, () => runSimulationCycle().catch((error) => console.error('[SIMULATOR] Cycle failed:', error)));
  console.info(`[SIMULATOR] Cron scheduled: ${expression}`);
  return job;
}

/** Run one cycle immediately (useful at startup). */
export { runSimulationCycle as runSimulationCycleOnStart };
