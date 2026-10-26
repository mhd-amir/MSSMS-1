import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function tokenFrom(req) { return req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null; }

export async function optionalAuth(req, _res, next) {
  const token = tokenFrom(req);
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(payload.sub).select('_id username email role').lean();
    } catch { /* Invalid optional credentials do not grant elevated registration privileges. */ }
  }
  next();
}

export async function requireAuth(req, res, next) {
  const token = tokenFrom(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('_id username email role').lean();
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ error: 'You do not have permission to perform this action' });
}
