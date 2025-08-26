import mongoose from 'mongoose';

const StockTxnSchema = new mongoose.Schema({
  type: { type: String, enum: ['IN', 'OUT'], required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  quantity: { type: Number, required: true, min: 1 },
  referenceId: { type: String, required: true, index: true },
  handledBy: { type: String }, // free text (no auth)
  notes: { type: String }
}, { timestamps: { createdAt: 'timestamp', updatedAt: false } });

export default mongoose.model('StockTransaction', StockTxnSchema);
