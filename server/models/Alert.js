import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
  type: { type: String, enum: ['TEMPERATURE', 'HUMIDITY', 'STALE_DATA'], required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  message: { type: String, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['Open', 'Acknowledged', 'Resolved'], default: 'Open', index: true },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date
}, { timestamps: true });
alertSchema.index({ stationId: 1, type: 1, status: 1 });
export default mongoose.models.Alert || mongoose.model('Alert', alertSchema);
