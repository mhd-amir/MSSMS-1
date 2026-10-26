import Alert from '../models/Alert.js';
import Reading from '../models/Reading.js';

/** Creates at most one active alert per station and rule type. */
export async function raiseAlert(station, type, severity, message) {
  const active = await Alert.findOne({ stationId: station._id, type, status: { $in: ['Open', 'Acknowledged'] } });
  if (active) return active;
  return Alert.create({ stationId: station._id, type, severity, message, status: 'Open' });
}

export async function evaluateReading(station, reading) {
  const previous = await Reading.findOne({ stationId: station._id, isValid: true, timestamp: { $lt: reading.timestamp }, _id: { $ne: reading._id } }).sort({ timestamp: -1 }).lean();
  const alerts = [];
  if (reading.temperature > station.thresholds.tempMax || (previous && reading.temperature - previous.temperature > station.thresholds.tempJump)) {
    alerts.push(await raiseAlert(station, 'TEMPERATURE', 'High', `Temperature threshold or jump exceeded at ${station.name} (${reading.temperature} °C).`));
  }
  if (reading.humidity > station.thresholds.humidityMax) {
    alerts.push(await raiseAlert(station, 'HUMIDITY', 'Medium', `Humidity threshold exceeded at ${station.name} (${reading.humidity}%).`));
  }
  return alerts;
}

export async function checkStaleStations(stations, now = new Date()) {
  for (const station of stations) {
    const last = await Reading.findOne({ stationId: station._id, isValid: true }).sort({ timestamp: -1 }).lean();
    const ageMinutes = last ? (now - new Date(last.timestamp)) / 60000 : Infinity;
    if (ageMinutes > station.thresholds.staleMinutes) {
      await raiseAlert(station, 'STALE_DATA', 'High', `No valid reading received within ${station.thresholds.staleMinutes} minutes for ${station.name}.`);
    }
  }
}
