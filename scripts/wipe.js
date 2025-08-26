import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../src/models/Product.js';
import Warehouse from '../src/models/Warehouse.js';
import StockTransaction from '../src/models/StockTransaction.js';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

async function main() {
  await mongoose.connect(uri);
  await Promise.all([
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    StockTransaction.deleteMany({})
  ]);
  console.log('All collections cleared');
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
