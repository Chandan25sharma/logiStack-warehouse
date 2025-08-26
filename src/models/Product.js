import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema({
  warehouse: { type: String, index: true },
  godown: { type: String },
  compartment: { type: String },
  stack: { type: String }
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  sku: { type: String, required: true, index: true },
  name: { type: String, required: true, index: true },
  category: { type: String, index: true },
  batchNumber: { type: String, index: true },
  expiryDate: { type: Date, index: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'pcs' },
  location: { type: LocationSchema, default: {} },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

ProductSchema.index({ sku: 1, batchNumber: 1, expiryDate: 1 }, { unique: false });

export default mongoose.model('Product', ProductSchema);
