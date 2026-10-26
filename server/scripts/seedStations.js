import 'dotenv/config';
import mongoose from 'mongoose';
import Station from '../models/Station.js';
import Sensor from '../models/Sensor.js';
import Reading from '../models/Reading.js';
import { fetchWeather } from '../services/weatherService.js';
import { applyCalibration } from '../services/calibrationService.js';
import { validateReading } from '../services/validatorService.js';

const STATIONS = [
  {
    name: 'Washermanpet Observation Post',
    city: 'Chennai',
    state: 'Tamil Nadu',
    latitude: 13.1025,
    longitude: 80.2811,
    status: 'Active',
    thresholds: { tempMax: 38, tempJump: 4, humidityMax: 90, staleMinutes: 30 },
  },
  {
    name: 'Ramapuram Urban Station',
    city: 'Chennai',
    state: 'Tamil Nadu',
    latitude: 13.0312,
    longitude: 80.1812,
    status: 'Active',
    thresholds: { tempMax: 40, tempJump: 5, humidityMax: 88, staleMinutes: 30 },
  },
  {
    name: 'OMR Tech Corridor Station',
    city: 'Chennai',
    state: 'Tamil Nadu',
    latitude: 12.825,
    longitude: 80.2185,
    status: 'Active',
    thresholds: { tempMax: 39, tempJump: 5, humidityMax: 92, staleMinutes: 30 },
  },
  {
    name: 'Madurai Central Met Observatory',
    city: 'Madurai',
    state: 'Tamil Nadu',
    latitude: 9.9252,
    longitude: 78.1198,
    status: 'Active',
    thresholds: { tempMax: 42, tempJump: 5, humidityMax: 85, staleMinutes: 30 },
  },
  {
    name: 'Coimbatore Hillside Station',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    latitude: 11.0168,
    longitude: 76.9558,
    status: 'Active',
    thresholds: { tempMax: 36, tempJump: 4, humidityMax: 80, staleMinutes: 30 },
  },
  {
    name: 'Trichy Cauvery Basin Post',
    city: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    latitude: 10.7905,
    longitude: 78.7047,
    status: 'Active',
    thresholds: { tempMax: 41, tempJump: 5, humidityMax: 85, staleMinutes: 30 },
  },
  {
    name: 'Salem Shevaroy Base Station',
    city: 'Salem',
    state: 'Tamil Nadu',
    latitude: 11.6643,
    longitude: 78.146,
    status: 'Active',
    thresholds: { tempMax: 39, tempJump: 5, humidityMax: 82, staleMinutes: 30 },
  },
  {
    name: 'Tirunelveli Gateway Station',
    city: 'Tirunelveli',
    state: 'Tamil Nadu',
    latitude: 8.7139,
    longitude: 77.7567,
    status: 'Active',
    thresholds: { tempMax: 39, tempJump: 4, humidityMax: 88, staleMinutes: 30 },
  },
  {
    name: 'Kanyakumari Coastal Station',
    city: 'Kanyakumari',
    state: 'Tamil Nadu',
    latitude: 8.0883,
    longitude: 77.5385,
    status: 'Active',
    thresholds: { tempMax: 35, tempJump: 4, humidityMax: 95, staleMinutes: 30 },
  },
  {
    name: 'Ooty High-Altitude Station',
    city: 'Udhagamandalam',
    state: 'Tamil Nadu',
    latitude: 11.4102,
    longitude: 76.695,
    status: 'Active',
    thresholds: { tempMax: 26, tempJump: 3, humidityMax: 95, staleMinutes: 30 },
  },
];

const SENSOR_TYPES = [
  { type: 'temperature', suffix: 'Temp Sensor T1' },
  { type: 'humidity', suffix: 'Relative Humidity RH1' },
  { type: 'wind', suffix: 'Anemometer W1' },
  { type: 'pressure', suffix: 'Barometer P1' },
];

const CALIBRATION_INTERVAL_DAYS = 90;
const LAST_CALIBRATED = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const FETCH_WEATHER_ON_SEED = true;

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mssms');

  await mongoose.connection.db.dropCollection('stations').catch(() => {});
  await mongoose.connection.db.dropCollection('sensors').catch(() => {});
  await mongoose.connection.db.dropCollection('readings').catch(() => {});
  console.log('[SEED] Dropped existing Stations, Sensors, and Readings collections');

  for (const stationData of STATIONS) {
    const station = await Station.create(stationData);

    const sensors = [];
    for (const { type, suffix } of SENSOR_TYPES) {
      const name = `${station.name} - ${suffix}`;
      const calibration = applyCalibration({ calibrationIntervalDays: CALIBRATION_INTERVAL_DAYS }, LAST_CALIBRATED);
      const sensor = await Sensor.create({
        stationId: station._id,
        type,
        name,
        lastCalibrated: calibration.lastCalibrated,
        calibrationIntervalDays: CALIBRATION_INTERVAL_DAYS,
        nextDue: calibration.nextDue,
      });
      sensors.push(sensor);
    }

    console.log(`[SEED] Created Station: ${station.name} (${sensors.length} sensors created)`);

    if (FETCH_WEATHER_ON_SEED) {
      try {
        const payload = await fetchWeather(station.latitude, station.longitude);
        const validation = validateReading(payload);
        const reading = await Reading.create({
          stationId: station._id,
          ...payload,
          isValid: validation.isValid,
        });
        console.log(
          `  [INGEST] ${station.name}: ${reading.temperature}°C / ${reading.humidity}% / ${reading.windSpeed} m/s / ${reading.pressure} hPa (isValid: ${validation.isValid})`,
        );
      } catch (error) {
        console.warn(`  [INGEST] ${station.name}: fetch failed - ${error.message}`);
      }
    }
  }

  await mongoose.disconnect();
  console.log('[SEED] Complete. Disconnected from MongoDB.');
}

seed().catch((error) => {
  console.error('[SEED] Failed:', error.message);
  process.exitCode = 1;
});
