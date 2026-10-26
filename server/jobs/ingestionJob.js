import cron from 'node-cron';
import Station from '../models/Station.js';
import Reading from '../models/Reading.js';
import { fetchWeather } from '../services/weatherService.js';
import { validateReading } from '../services/validatorService.js';
import { checkStaleStations, evaluateReading } from '../services/alertEngine.js';

export async function runIngestionCycle() {
  const stations = await Station.find({ status: 'Active' });
  for (const station of stations) {
    try {
      const payload = await fetchWeather(station.latitude, station.longitude);
      const validation = validateReading(payload);
      if (!validation.isValid) {
        console.warn(`[ingestion] Rejected out-of-bounds Open-Meteo reading for ${station.name}`, validation.errors);
        // Keep an auditable record of provider data that failed quality checks;
        // all dashboard, alert, trend and export queries exclude invalid rows.
        await Reading.create({ stationId: station._id, ...payload, isValid: false });
        continue;
      }
      const reading = await Reading.create({ stationId: station._id, ...payload, isValid: true });
      await evaluateReading(station, reading);
    } catch (error) {
      console.error(`[ingestion] Open-Meteo request failed for ${station.name}: ${error.message}`);
    }
  }
  await checkStaleStations(stations);
}

export function startIngestionJob() {
  const expression = process.env.INGEST_CRON || '*/10 * * * *';
  if (!cron.validate(expression)) throw new Error(`Invalid INGEST_CRON expression: ${expression}`);
  const job = cron.schedule(expression, () => runIngestionCycle().catch((error) => console.error('[ingestion] Cycle failed:', error)));
  return job;
}
