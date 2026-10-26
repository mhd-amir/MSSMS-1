import { Router } from 'express';
import Alert from '../models/Alert.js';
import { validateObjectId } from '../services/validatorService.js';
const router = Router();
router.get('/', async (req, res, next) => {
  try {
    const query = {};
    for (const key of ['status', 'type', 'severity']) if (req.query[key]) query[key] = req.query[key];
    const rows = await Alert.find(query).populate('stationId', 'name city state').sort({ createdAt: -1 }).limit(1000).lean(); return res.json(rows);
  } catch (e) { return next(e); }
});
router.put('/:id', async (req, res, next) => {
  try {
    if (req.body.status === 'Acknowledged' && !['Admin', 'Operator'].includes(req.user.role)) return res.status(403).json({ error: 'Only Admins and Operators can acknowledge alerts' });
    if (req.body.status === 'Resolved' && req.user.role !== 'Admin') return res.status(403).json({ error: 'Only Admins can resolve alerts' });
    if (!validateObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid alert id' });
    if (!['Acknowledged', 'Resolved'].includes(req.body.status)) return res.status(400).json({ error: 'status must be Acknowledged or Resolved' });
    const update = { status: req.body.status, ...(req.body.status === 'Resolved' ? { resolvedAt: new Date() } : { $unset: { resolvedAt: 1 } }) };
    const alert = await Alert.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }); return alert ? res.json(alert) : res.status(404).json({ error: 'Alert not found' });
  } catch (e) { return next(e); }
});
export default router;
