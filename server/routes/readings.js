import { Router } from 'express';
import Station from '../models/Station.js';
import Reading from '../models/Reading.js';
import { validateObjectId } from '../services/validatorService.js';
const router = Router();
router.get('/', async (req, res, next) => {
  try {
    if (req.query.stationId && !validateObjectId(req.query.stationId)) return res.status(400).json({ error: 'Invalid stationId' });
    const query = { isValid: true };
    if (req.query.stationId) query.stationId = req.query.stationId;
    const [readings, stations] = await Promise.all([Reading.find(query).sort({ timestamp: -1 }).limit(500).lean(), Station.find({ status: 'Active' }).lean()]);
    const latestByStation = new Map(); for (const r of readings) if (!latestByStation.has(String(r.stationId))) latestByStation.set(String(r.stationId), r);
    return res.json(stations.map((station) => ({ station, reading: latestByStation.get(String(station._id)) || null })));
  } catch (e) { return next(e); }
});
export default router;
