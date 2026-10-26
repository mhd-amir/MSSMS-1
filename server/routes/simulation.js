/**
 * Manual chaos / testing endpoints for MSSMS.
 *
 * Admin-only routes to trigger readings and backfill historical mock data
 * on demand, exercising the validator, alert engine, trend charts, and
 * reports without calling external APIs.
 */

import { Router } from 'express';
import mongoose from 'mongoose';
import Station from '../models/Station.js';
import Reading from '../models/Reading.js';
import { validateReading } from '../services/validatorService.js';
import { evaluateReading } from '../services/alertEngine.js';
import { generateReading, generateHistoricalReadings } from '../services/simulatorService.js';
import { allowRoles } from '../middleware/auth.js';

const router = Router();
const bad = (res, errors) => res.status(400).json({ error: 'Validation failed', details: errors });

/**
 * POST /api/simulation/inject-reading
 * Body: { stationId, type: 'NORMAL' | 'TEMP_SPIKE' | 'HUMIDITY_SPIKE' | 'INVALID_BOUNDS' }
 * Generates and persists a single reading immediately and triggers the alert engine.
 */
router.post(
  '/inject-reading',
  allowRoles('Admin'),
  async (req, res, next) => {
    try {
      const { stationId, type = 'NORMAL' } = req.body;
      if (!stationId || typeof stationId !== 'string') {
        return res.status(400).json({ error: 'stationId is required' });
      }
      if (!mongoose.Types.ObjectId.isValid(stationId)) {
        return res.status(400).json({ error: 'Invalid stationId' });
      }
      const station = await Station.findById(stationId);
      if (!station) return res.status(404).json({ error: 'Station not found' });

      const { reading, mode } = generateReading(station, { mode: type });
      const validation = validateReading(reading);
      const doc = await Reading.create({ ...reading, isValid: validation.isValid });
      await evaluateReading(station, doc);

      return res.status(201).json({
        message: `Injected ${mode} reading for ${station.name}`,
        reading: { ...doc.toObject(), isValid: validation.isValid },
      });
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * POST /api/simulation/backfill
 * Body: { stationId, days: 3 }
 * Instantly populates N days of past mock readings for a single station.
 */
router.post(
  '/backfill',
  allowRoles('Admin'),
  async (req, res, next) => {
    try {
      const { stationId, days = 3 } = req.body;
      if (!stationId || typeof stationId !== 'string') {
        return res.status(400).json({ error: 'stationId is required' });
      }
      if (!mongoose.Types.ObjectId.isValid(stationId)) {
        return res.status(400).json({ error: 'Invalid stationId' });
      }
      const numDays = Number(days);
      if (!Number.isInteger(numDays) || numDays < 1 || numDays > 30) {
        return res.status(400).json({ error: 'days must be an integer between 1 and 30' });
      }

      const station = await Station.findById(stationId);
      if (!station) return res.status(404).json({ error: 'Station not found' });

      const readings = generateHistoricalReadings(station, { days: numDays });
      const validReadings = readings.map((reading) => {
        const validation = validateReading(reading);
        return { ...reading, isValid: validation.isValid };
      });

      // Bulk insert in chunks
      const BATCH_SIZE = 500;
      let inserted = 0;
      for (let i = 0; i < validReadings.length; i += BATCH_SIZE) {
        const chunk = validReadings.slice(i, i + BATCH_SIZE);
        await Reading.insertMany(chunk, { ordered: false });
        inserted += chunk.length;
      }

      // Evaluate the most recent reading for alerting
      const latest = validReadings[0];
      if (latest) {
        const latestDoc = await Reading.findById(latest._id);
        await evaluateReading(station, latestDoc);
      }

      return res.json({
        message: `Backfilled ${inserted} readings (${numDays} days) for ${station.name}`,
        stationId: station._id,
        days: numDays,
        inserted,
      });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
