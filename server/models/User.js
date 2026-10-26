import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, lowercase: true, minlength: 3, maxlength: 40, unique: true },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['Admin', 'Operator', 'Viewer'], default: 'Viewer', required: true }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
