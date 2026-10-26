import { Router } from 'express';
import Sensor from '../models/Sensor.js';
import Station from '../models/Station.js';
import { applyCalibration, calibrationStatus } from '../services/calibrationService.js';
import { validateObjectId, validateSensor } from '../services/validatorService.js';
import { allowRoles } from '../middleware/auth.js';
const router = Router();
router.get('/', allowRoles('Admin', 'Operator'), async (_req, res, next) => { try { const docs = await Sensor.find().populate('stationId', 'name').sort({ createdAt: -1 }).lean(); return res.json(docs.map((s) => ({ ...s, calibration: calibrationStatus(s) }))); } catch (e) { next(e); } });
router.post('/', allowRoles('Admin'), async (req, res, next) => {
  try {
    const v = validateSensor(req.body); if (!v.isValid) return res.status(400).json({ error: 'Validation failed', details: v.errors });
    if (!validateObjectId(req.body.stationId)) return res.status(400).json({ error: 'Invalid stationId' });
    if (!await Station.exists({ _id: req.body.stationId })) return res.status(404).json({ error: 'Station not found' });
    const calibration = req.body.lastCalibrated ? applyCalibration(req.body) : {};
    const sensor = await Sensor.create({ ...req.body, ...calibration }); return res.status(201).json({ ...sensor.toObject(), calibration: calibrationStatus(sensor) });
  } catch (e) { if (e.code === 11000) return res.status(409).json({ error: 'A sensor of this type already exists for this station' }); return next(e); }
});
router.put('/:id/calibrate', allowRoles('Admin'), async (req, res, next) => {
  try {
    if (!validateObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid sensor id' });
    const calibratedOn = req.body.calibratedOn ? new Date(req.body.calibratedOn) : new Date();
    if (Number.isNaN(calibratedOn.getTime())) return res.status(400).json({ error: 'calibratedOn must be a valid date' });
    const sensor = await Sensor.findById(req.params.id); if (!sensor) return res.status(404).json({ error: 'Sensor not found' });
    Object.assign(sensor, applyCalibration(sensor, calibratedOn)); await sensor.save();
    return res.json({ ...sensor.toObject(), calibration: calibrationStatus(sensor) });
  } catch (e) { return next(e); }
});
export default router;
