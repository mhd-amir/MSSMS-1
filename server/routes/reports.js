import { Router } from 'express';
import Reading from '../models/Reading.js';
import { validateDateRange, validateObjectId } from '../services/validatorService.js';
const router = Router();
const csv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
router.get('/readings.csv', async (req, res, next) => {
  try {
    const range = validateDateRange(req.query.from, req.query.to); if (!range.isValid) return res.status(400).json({ error: 'Invalid date range', details: range.errors });
    if (req.query.stationId && !validateObjectId(req.query.stationId)) return res.status(400).json({ error: 'Invalid stationId' });
    const query = { isValid: true };
    if (req.query.stationId) query.stationId = req.query.stationId;
    if (range.start || range.end) query.timestamp = { ...(range.start && { $gte: range.start }), ...(range.end && { $lte: range.end }) };
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mssms-readings.csv"');
    res.write('timestamp,stationId,temperature,humidity,windSpeed,pressure,source\r\n');
    const cursor = Reading.find(query).sort({ timestamp: 1 }).cursor();
    for await (const row of cursor) res.write([row.timestamp?.toISOString(), row.stationId, row.temperature, row.humidity, row.windSpeed, row.pressure, row.source].map(csv).join(',') + '\r\n');
    return res.end();
  } catch (e) { return next(e); }
});
export default router;
