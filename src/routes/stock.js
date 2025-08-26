import express from 'express';
import Product from '../models/Product.js';
import StockTransaction from '../models/StockTransaction.js';
import { customAlphabet } from 'nanoid';

const router = express.Router();
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 10);

// POST /api/stock/in
router.post('/in', async (req, res, next) => {
  try {
    const { productId, quantity, handledBy, notes, referenceId } = req.body;
    if (!productId || !quantity) throw new Error('productId and quantity are required');

    const ref = referenceId || `IN-${nanoid()}`;
    const session = await Product.startSession();
    await session.withTransaction(async () => {
      const product = await Product.findById(productId).session(session);
      if (!product) throw new Error('Product not found');
      product.quantity += Number(quantity);
      await product.save({ session });
      await StockTransaction.create([{ type: 'IN', productId, quantity, handledBy, notes, referenceId: ref }], { session });
    });
    session.endSession();
    res.status(201).json({ ok: true, referenceId: ref });
  } catch (e) { next(e); }
});

// POST /api/stock/out
router.post('/out', async (req, res, next) => {
  try {
    const { productId, quantity, handledBy, notes, referenceId } = req.body;
    if (!productId || !quantity) throw new Error('productId and quantity are required');

    const ref = referenceId || `OUT-${nanoid()}`;
    const session = await Product.startSession();
    await session.withTransaction(async () => {
      const product = await Product.findById(productId).session(session);
      if (!product) throw new Error('Product not found');
      if (product.quantity < Number(quantity)) {
        const err = new Error('Insufficient stock');
        err.status = 400;
        throw err;
      }
      product.quantity -= Number(quantity);
      await product.save({ session });
      await StockTransaction.create([{ type: 'OUT', productId, quantity, handledBy, notes, referenceId: ref }], { session });
    });
    session.endSession();
    res.status(201).json({ ok: true, referenceId: ref });
  } catch (e) { next(e); }
});

// GET /api/stock/logs
router.get('/logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, from, to, productId } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (productId) filter.productId = productId;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      StockTransaction.find(filter).sort('-timestamp').skip(skip).limit(Number(limit)).populate('productId', 'sku name'),
      StockTransaction.countDocuments(filter)
    ]);
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) { next(e); }
});

export default router;
