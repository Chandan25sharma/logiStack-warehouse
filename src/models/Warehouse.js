import mongoose from 'mongoose';

const CompartmentSchema = new mongoose.Schema({
  name: String,
  stacks: Number
}, { _id: false });

const GodownSchema = new mongoose.Schema({
  name: String,
  capacity: Number,
  compartments: [CompartmentSchema]
}, { _id: false });

const WarehouseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  capacity: { type: Number, default: 0 },
  godowns: [GodownSchema]
}, { timestamps: true });

export default mongoose.model('Warehouse', WarehouseSchema);
