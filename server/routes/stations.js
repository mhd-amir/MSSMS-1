import { Router } from 'express';
import mongoose from 'mongoose';
import Station from '../models/Station.js';
import Reading from '../models/Reading.js';
import { validateDateRange, validateObjectId, validateStation } from '../services/validatorService.js';
import { allowRoles } from '../middleware/auth.js';

const router = Router();
const bad = (res, errors) => res.status(400).json({ error: 'Validation failed', details: errors });
router.get('/', async (_req, res, next) => { try { res.json(await Station.find().sort({ name: 1 }).lean()); } catch (e) { next(e); } });
router.post('/', allowRoles('Admin'), async (req, res, next) => {
  try { const v = validateStation(req.body); if (!v.isValid) return bad(res, v.errors); const station = await Station.create(req.body); return res.status(201).json(station); }
  catch (e) { if (e.code === 11000) return res.status(409).json({ error: 'A station with this name already exists' }); return next(e); }
});
router.get('/:id/readings', async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid station id' });
    const range = validateDateRange(req.query.from, req.query.to); if (!range.isValid) return bad(res, range.errors);
    const station = await Station.findById(req.params.id).lean(); if (!station) return res.status(404).json({ error: 'Station not found' });
    const query = { stationId: station._id, isValid: true };
    if (range.start || range.end) query.timestamp = { ...(range.start && { $gte: range.start }), ...(range.end && { $lte: range.end }) };
    const readings = await Reading.find(query).sort({ timestamp: 1 }).limit(10000).lean();
    return res.json({ station: station.name, count: readings.length, readings });
  } catch (e) { return next(e); }
});
router.put('/:id', allowRoles('Admin'), async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid station id' });
    const v = validateStation(req.body, { partial: true }); if (!v.isValid) return bad(res, v.errors);
    const update = { ...req.body };
    if (update.thresholds) update.thresholds = Object.fromEntries(Object.entries(update.thresholds).map(([k, v]) => [`thresholds.${k}`, v]));
    const station = await Station.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
    return station ? res.json(station) : res.status(404).json({ error: 'Station not found' });
  } catch (e) { if (e.code === 11000) return res.status(409).json({ error: 'A station with this name already exists' }); return next(e); }
});
export default router;
