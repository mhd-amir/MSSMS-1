export function calibrationStatus(sensor, now = new Date()) {
  const nextDue = sensor.nextDue ? new Date(sensor.nextDue) : sensor.lastCalibrated ? new Date(sensor.lastCalibrated) : null;
  if (!nextDue && sensor.lastCalibrated) nextDue.setDate(nextDue.getDate() + (sensor.calibrationIntervalDays || 90));
  if (!nextDue) return { status: 'Overdue', nextDue: null, daysLeft: null };
  const daysLeft = Math.ceil((nextDue.getTime() - now.getTime()) / 86400000);
  return { status: daysLeft < 0 ? 'Overdue' : daysLeft <= 7 ? 'Due Soon' : 'Calibrated', nextDue, daysLeft };
}

export function applyCalibration(sensor, calibratedOn = new Date()) {
  const lastCalibrated = new Date(calibratedOn);
  const nextDue = new Date(lastCalibrated);
  nextDue.setDate(nextDue.getDate() + (sensor.calibrationIntervalDays || 90));
  return { lastCalibrated, nextDue };
}
