import mongoose from 'mongoose';

const stationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 120 },
  city: { type: String, trim: true, maxlength: 100 },
  state: { type: String, trim: true, maxlength: 100 },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  thresholds: {
    tempMax: { type: Number, min: -90, max: 60, default: 40 },
    tempJump: { type: Number, min: 0, max: 150, default: 5 },
    humidityMax: { type: Number, min: 0, max: 100, default: 90 },
    staleMinutes: { type: Number, min: 1, max: 10080, default: 30 }
  }
}, { timestamps: true });

export default mongoose.models.Station || mongoose.model('Station', stationSchema);
