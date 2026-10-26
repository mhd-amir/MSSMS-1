import { Router } from 'express';
import Maintenance from '../models/Maintenance.js';
import Station from '../models/Station.js';
import Sensor from '../models/Sensor.js';
import { validateObjectId } from '../services/validatorService.js';
import { allowRoles } from '../middleware/auth.js';
const router = Router();
router.get('/', allowRoles('Admin', 'Operator'), async (req, res, next) => {
  try { const query = {}; if (req.query.stationId) { if (!validateObjectId(req.query.stationId)) return res.status(400).json({ error: 'Invalid stationId' }); query.stationId = req.query.stationId; } return res.json(await Maintenance.find(query).populate('stationId', 'name').populate('sensorId', 'name type').sort({ performedOn: -1 }).lean()); }
  catch (e) { next(e); }
});
router.post('/', allowRoles('Admin', 'Operator'), async (req, res, next) => {
  try {
    if (!validateObjectId(req.body.stationId)) return res.status(400).json({ error: 'Invalid stationId' });
    if (!req.body.type || typeof req.body.type !== 'string' || !req.body.type.trim()) return res.status(400).json({ error: 'type is required' });
    if (req.body.status && !['Planned', 'Done'].includes(req.body.status)) return res.status(400).json({ error: 'status must be Planned or Done' });
    if (!await Station.exists({ _id: req.body.stationId })) return res.status(404).json({ error: 'Station not found' });
    if (req.body.sensorId && (!validateObjectId(req.body.sensorId) || !await Sensor.exists({ _id: req.body.sensorId, stationId: req.body.stationId }))) return res.status(400).json({ error: 'sensorId must identify a sensor belonging to the station' });
    const doc = await Maintenance.create(req.body); return res.status(201).json(doc);
  } catch (e) { next(e); }
});
export default router;
