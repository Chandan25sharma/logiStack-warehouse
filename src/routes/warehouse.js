import express from 'express';
import Warehouse from '../models/Warehouse.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const items = await Warehouse.find().sort('name');
    res.json(items);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const doc = await Warehouse.create(req.body);
    res.status(201).json(doc);
  } catch (e) { next(e); }
});

export default router;
