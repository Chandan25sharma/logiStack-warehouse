import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// GET /api/inventory - list with filters
router.get('/', async (req, res, next) => {
  try {
    const { q, category, warehouse, lowStock, page = 1, limit = 20, sort = '-updatedAt' } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { batchNumber: { $regex: q, $options: 'i' } }
      ];
    }
    if (category) filter.category = category;
    if (warehouse) filter['location.warehouse'] = warehouse;
    if (lowStock === 'true') filter.quantity = { $lte: 10 };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter)
    ]);

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) { next(e); }
});

// POST /api/inventory - create
router.post('/', async (req, res, next) => {
  try {
    const doc = await Product.create(req.body);
    res.status(201).json(doc);
  } catch (e) { next(e); }
});

// PUT /api/inventory/:id - update
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Product.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
  } catch (e) { next(e); }
});

// DELETE /api/inventory/:id - delete
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
