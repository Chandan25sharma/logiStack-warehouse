import express from 'express';
import Product from '../models/Product.js';
import StockTransaction from '../models/StockTransaction.js';
import { sendCSV } from '../utils/csv.js';

const router = express.Router();

// GET /api/reports/summary
router.get('/summary', async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date();
    endOfDay.setHours(23,59,59,999);

    const [totalProducts, stockAgg, todayIn, todayOut] = await Promise.all([
      Product.countDocuments({}),
      Product.aggregate([{ $group: { _id: null, qty: { $sum: '$quantity' } } }]),
      StockTransaction.countDocuments({ type: 'IN', timestamp: { $gte: startOfDay, $lte: endOfDay } }),
      StockTransaction.countDocuments({ type: 'OUT', timestamp: { $gte: startOfDay, $lte: endOfDay } })
    ]);

    const totalQty = stockAgg[0]?.qty || 0;
    res.json({ totalProducts, totalQty, todayIn, todayOut });
  } catch (e) { next(e); }
});

// GET /api/reports/warehouse-utilization
router.get('/warehouse-utilization', async (req, res, next) => {
  try {
    // Sum quantities per warehouse in products
    const rows = await Product.aggregate([
      { $group: { _id: '$location.warehouse', quantity: { $sum: '$quantity' } } },
      { $project: { _id: 0, warehouse: '$_id', quantity: 1 } },
      { $sort: { warehouse: 1 } }
    ]);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/reports/stock
router.get('/stock', async (req, res, next) => {
  try {
    const { format } = req.query;
    const rows = await Product.aggregate([
      { $group: { _id: { sku: '$sku', name: '$name', category: '$category', unit: '$unit' }, quantity: { $sum: '$quantity' } } },
      { $project: { _id: 0, sku: '$_id.sku', name: '$_id.name', category: '$_id.category', unit: '$_id.unit', quantity: 1 } },
      { $sort: { name: 1 } }
    ]);

    if (format === 'csv') {
      return sendCSV(res, rows, ['sku','name','category','unit','quantity'], 'stock_report.csv');
    }
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/reports/movement
router.get('/movement', async (req, res, next) => {
  try {
    const { format, from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    const rows = await StockTransaction.find(filter).sort('-timestamp').populate('productId', 'sku name category').lean();
    const shaped = rows.map(r => ({
      type: r.type,
      referenceId: r.referenceId,
      productSku: r.productId?.sku,
      productName: r.productId?.name,
      category: r.productId?.category,
      quantity: r.quantity,
      handledBy: r.handledBy,
      timestamp: r.timestamp
    }));

    if (format === 'csv') {
      return sendCSV(res, shaped, ['type','referenceId','productSku','productName','category','quantity','handledBy','timestamp'], 'movement_report.csv');
    }
    res.json(shaped);
  } catch (e) { next(e); }
});

// GET /api/reports/alerts
router.get('/alerts', async (req, res, next) => {
  try {
    const threshold = Number(req.query.threshold || 10);
    const today = new Date();
    const soon = new Date(Date.now() + 1000*60*60*24*30);

    const [lowStock, expired, nearExpiry] = await Promise.all([
      Product.find({ quantity: { $lte: threshold } }).sort('quantity').limit(200),
      Product.find({ expiryDate: { $exists: true, $ne: null, $lt: today } }).sort('expiryDate').limit(200),
      Product.find({ expiryDate: { $exists: true, $ne: null, $gte: today, $lte: soon } }).sort('expiryDate').limit(200)
    ]);

    res.json({ lowStock, expired, nearExpiry });
  } catch (e) { next(e); }
});

export default router;
