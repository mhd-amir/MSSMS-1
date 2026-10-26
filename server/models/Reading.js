import mongoose from 'mongoose';

const readingSchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
  timestamp: { type: Date, default: Date.now, required: true },
  temperature: { type: Number, required: true },
  humidity: { type: Number, required: true },
  windSpeed: { type: Number, required: true },
  pressure: { type: Number, required: true },
  source: { type: String, default: 'Open-Meteo' },
  isValid: { type: Boolean, default: true, index: true }
}, { timestamps: true });
readingSchema.index({ stationId: 1, timestamp: -1 });
export default mongoose.models.Reading || mongoose.model('Reading', readingSchema);
