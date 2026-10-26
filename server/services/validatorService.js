/** Shared request and telemetry validation. Returns field-level errors for API clients. */
const bounds = { temperature: [-90, 60], humidity: [0, 100], windSpeed: [0, 120], pressure: [850, 1090] };
const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v);

export function validateReading(reading = {}) {
  const errors = {};
  for (const [field, [min, max]] of Object.entries(bounds)) {
    const value = reading[field];
    if (!isFiniteNumber(value) || value < min || value > max) errors[field] = `Must be a finite number between ${min} and ${max}`;
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateStation(input = {}, { partial = false } = {}) {
  const errors = {};
  const required = (key) => !partial || Object.hasOwn(input, key);
  if (required('name') && (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 120)) errors.name = 'Name is required and must be at most 120 characters';
  for (const [key, min, max] of [['latitude', -90, 90], ['longitude', -180, 180]]) {
    if (required(key) && (!isFiniteNumber(input[key]) || input[key] < min || input[key] > max)) errors[key] = `Must be a finite number between ${min} and ${max}`;
  }
  if (input.status !== undefined && !['Active', 'Inactive'].includes(input.status)) errors.status = 'Must be Active or Inactive';
  if (input.thresholds !== undefined) {
    if (!input.thresholds || typeof input.thresholds !== 'object' || Array.isArray(input.thresholds)) errors.thresholds = 'Must be an object';
    else for (const [key, min, max] of [['tempMax', -90, 60], ['tempJump', 0, 150], ['humidityMax', 0, 100], ['staleMinutes', 1, 10080]]) {
      if (input.thresholds[key] !== undefined && (!isFiniteNumber(input.thresholds[key]) || input.thresholds[key] < min || input.thresholds[key] > max)) errors[`thresholds.${key}`] = `Must be a finite number between ${min} and ${max}`;
    }
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateDateRange(from, to) {
  const errors = {};
  const start = from ? new Date(from) : null;
  const end = to ? new Date(to) : null;
  if (from && Number.isNaN(start.getTime())) errors.from = 'Must be a valid date';
  if (to && Number.isNaN(end.getTime())) errors.to = 'Must be a valid date';
  if (start && end && start > end) errors.to = 'Must be later than or equal to from';
  return { isValid: Object.keys(errors).length === 0, errors, start, end };
}

export function validateObjectId(value) { return /^[a-f\d]{24}$/i.test(String(value ?? '')); }
export function validateSensor(input = {}) {
  const errors = {};
  if (!['temperature', 'humidity', 'wind', 'pressure'].includes(input.type)) errors.type = 'Unsupported sensor type';
  if (input.calibrationIntervalDays !== undefined && (!Number.isInteger(input.calibrationIntervalDays) || input.calibrationIntervalDays < 1 || input.calibrationIntervalDays > 3650)) errors.calibrationIntervalDays = 'Must be an integer from 1 to 3650';
  return { isValid: Object.keys(errors).length === 0, errors };
}
