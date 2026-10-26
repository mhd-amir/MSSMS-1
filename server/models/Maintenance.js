import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
  sensorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sensor' },
  type: { type: String, trim: true, required: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 2000 },
  performedOn: { type: Date, default: Date.now },
  performedBy: { type: String, trim: true, maxlength: 120 },
  status: { type: String, enum: ['Planned', 'Done'], default: 'Done' }
}, { timestamps: true });
export default mongoose.models.Maintenance || mongoose.model('Maintenance', maintenanceSchema);
