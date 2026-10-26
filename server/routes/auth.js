import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();
const safeUser = (user) => ({ id: user._id, username: user.username, email: user.email, role: user.role });
function sign(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '12h' });
}

router.post('/register', optionalAuth, async (req, res, next) => {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    const errors = {};
    if (!/^[A-Za-z0-9_.-]{3,40}$/.test(username)) errors.username = 'Use 3–40 letters, numbers, dots, underscores or hyphens';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.email = 'Enter a valid email address';
    if (typeof password !== 'string' || password.length < 10 || Buffer.byteLength(password, 'utf8') > 72) errors.password = 'Password must be at least 10 characters and no more than 72 UTF-8 bytes';
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed', details: errors });
    const count = await User.countDocuments();
    const requestedRole = ['Admin', 'Operator', 'Viewer'].includes(req.body.role) ? req.body.role : 'Viewer';
    const role = req.user?.role === 'Admin' ? requestedRole : count === 0 ? 'Admin' : 'Viewer';
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, passwordHash, role });
    return res.status(201).json({ token: sign(user), user: safeUser(user), message: role === 'Admin' && count === 0 ? 'Initial administrator account created' : undefined });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Username or email is already registered' });
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const login = typeof req.body.login === 'string' ? req.body.login.trim().toLowerCase() : '';
    const password = req.body.password;
    if (!login || typeof password !== 'string') return res.status(400).json({ error: 'Email or username and password are required' });
    const user = await User.findOne({ $or: [{ email: login }, { username: login }] }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
    return res.json({ token: sign(user), user: safeUser(user) });
  } catch (error) { return next(error); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
export default router;
