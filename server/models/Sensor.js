import mongoose from 'mongoose';

const sensorSchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
  type: { type: String, enum: ['temperature', 'humidity', 'wind', 'pressure'], required: true },
  name: { type: String, trim: true, maxlength: 120 },
  lastCalibrated: Date,
  calibrationIntervalDays: { type: Number, min: 1, max: 3650, default: 90 },
  nextDue: Date
}, { timestamps: true });
sensorSchema.index({ stationId: 1, type: 1 }, { unique: true });
export default mongoose.models.Sensor || mongoose.model('Sensor', sensorSchema);
