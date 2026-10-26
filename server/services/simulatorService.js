/**
 * Pure meteorological simulation utility for MSSMS.
 *
 * Generates realistic weather readings using diurnal cycles, inverse
 * temperature/humidity correlation, pressure/wind variance, and optional
 * fault/extreme-condition injection for testing the validator, alert engine,
 * trend charts, and reports without calling external APIs.
 */

const TWO_PI = 2 * Math.PI;

const DEFAULT_BASE_TEMP = 28;
const DEFAULT_AMPLITUDE = 6;
const DEFAULT_BASE_HUMIDITY = 75;
const DEFAULT_PRESSURE = 1013.25;
const PRESSURE_VARIANCE = 5;
const WIND_MIN = 1.0;
const WIND_MAX = 12.5;
const GUST_PROBABILITY = 0.05;

/** Approximate standard normal via Box-Muller transform. */
function gaussian(scale = 1) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(TWO_PI * v);
  return z * scale;
}

/** Clamp a value between min and max. */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Decimal hour (0-24) from a Date. */
export function diurnalHour(referenceTime = new Date()) {
  return referenceTime.getHours() + referenceTime.getMinutes() / 60;
}

/** Base temperature heuristic from station latitude (Tamil Nadu range ~8-13). */
export function deriveBaseTemp(latitude) {
  return DEFAULT_BASE_TEMP - Math.abs(latitude - 11) * 0.4;
}

/** Diurnal temperature cycle: peak ~14:00, trough ~02:00 (early morning). */
export function generateTemperature(baseTemp, amplitude, hour, noiseScale) {
  const cycle = Math.cos(TWO_PI * (hour - 14) / 24);
  return baseTemp + amplitude * cycle + gaussian(noiseScale);
}

/** Inverse humidity correlation with temperature, clamped 0-100%. */
export function generateHumidity(baseHumidity, temperature, baseTemp, noiseScale) {
  let humidity = baseHumidity - (temperature - baseTemp) * 2.5 + gaussian(noiseScale);
  return clamp(humidity, 0, 100);
}

/** Barometric pressure around 1013.25 hPa +/- variance, clamped to validator bounds. */
export function generatePressure(basePressure = DEFAULT_PRESSURE, variance = PRESSURE_VARIANCE, noiseScale = 0.5) {
  return clamp(basePressure + (Math.random() - 0.5) * 2 * variance + gaussian(noiseScale), 850, 1090);
}

/** Wind speed with random base and periodic gust spikes. */
export function generateWind(min = WIND_MIN, max = WIND_MAX, gustProbability = GUST_PROBABILITY) {
  let speed = min + Math.random() * (max - min);
  if (Math.random() < gustProbability) {
    speed = max * 0.85 + Math.random() * (max * 0.25);
  }
  return clamp(speed, 0, max);
}

/**
 * Generate a single simulated reading for a station.
 *
 * @param {Object} station - Station document (needs latitude, thresholds)
 * @param {Object} options
 * @param {Date} options.referenceTime - Time to model (defaults to now)
 * @param {'NORMAL'|'TEMP_SPIKE'|'HUMIDITY_SPIKE'|'INVALID_BOUNDS'} options.mode
 * @returns {{ reading: Object, mode: string }}
 */
export function generateReading(station, { referenceTime = new Date(), mode = 'NORMAL' } = {}) {
  const hour = diurnalHour(referenceTime);
  const baseTemp = deriveBaseTemp(station.latitude);
  const amplitude = DEFAULT_AMPLITUDE;
  const tempNoise = 0.3 + Math.random() * 0.5; // ±0.3 to ±0.8 °C

  let temperature = generateTemperature(baseTemp, amplitude, hour, tempNoise);
  let humidity = generateHumidity(DEFAULT_BASE_HUMIDITY, temperature, baseTemp, 2);
  const pressure = generatePressure();
  const windSpeed = generateWind();

  if (mode === 'TEMP_SPIKE') {
    temperature = station.thresholds.tempMax + 3 + Math.random() * 4;
  } else if (mode === 'HUMIDITY_SPIKE') {
    humidity = clamp(95 + Math.random() * 6, 0, 100);
  } else if (mode === 'INVALID_BOUNDS') {
    if (Math.random() < 0.5) {
      temperature = 85;
    } else {
      pressure = 400;
    }
  }

  const reading = {
    stationId: station._id,
    timestamp: referenceTime,
    temperature: Number(temperature.toFixed(2)),
    humidity: Number(humidity.toFixed(1)),
    windSpeed: Number(windSpeed.toFixed(2)),
    pressure: Number(pressure.toFixed(1)),
    source: 'SIMULATOR',
  };

  return { reading, mode };
}

/**
 * Generate a batch of historical readings for a station, stepping backwards
 * in fixed intervals from a reference time.
 *
 * @param {Object} station - Station document
 * @param {Object} options
 * @param {number} options.days - Days of history to generate
 * @param {number} options.intervalMinutes - Minutes between readings (default 10)
 * @param {Date} options.referenceTime - End time (defaults to now)
 * @param {'NORMAL'|'TEMP_SPIKE'|'HUMIDITY_SPIKE'|'INVALID_BOUNDS'} options.mode
 * @returns {Object[]} Array of reading documents (newest first)
 */
export function generateHistoricalReadings(station, {
  days = 7,
  intervalMinutes = 10,
  referenceTime = new Date(),
  mode = 'NORMAL',
} = {}) {
  const readings = [];
  const totalMinutes = days * 24 * 60;
  const steps = Math.floor(totalMinutes / intervalMinutes);

  for (let i = 0; i < steps; i++) {
    const ts = new Date(referenceTime.getTime() - i * intervalMinutes * 60000);
    const { reading } = generateReading(station, { referenceTime: ts, mode });
    readings.push(reading);
  }

  return readings;
}
