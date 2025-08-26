import 'dotenv/config';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import Product from '../src/models/Product.js';
import Warehouse from '../src/models/Warehouse.js';
import StockTransaction from '../src/models/StockTransaction.js';

process.on('unhandledRejection', (reason) => {
  console.error('UnhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UncaughtException:', err);
});

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

function randBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  await mongoose.connect(uri);
  console.log('Connected');

  // Clear existing
  console.log('Clearing collections...');
  await Promise.all([
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    StockTransaction.deleteMany({})
  ]);
  console.log('Collections cleared');

  // Create Warehouses
  const whCount = 2;
  const warehouses = [];
  for (let i = 1; i <= whCount; i++) {
    const godowns = [];
    for (let g = 1; g <= 3; g++) {
      const compartments = [];
      for (let c = 1; c <= 3; c++) {
        compartments.push({ name: `C${c}`, stacks: randBetween(3, 8) });
      }
      godowns.push({ name: `G${g}`, capacity: randBetween(500, 1500), compartments });
    }
    warehouses.push({ name: `WH-${i}`, capacity: randBetween(3000, 7000), godowns });
  }
  console.log('Inserting warehouses...');
  const whDocs = await Warehouse.insertMany(warehouses);
  console.log(`Inserted warehouses: ${whDocs.length}`);

  // Categories/units
  const categories = ['Food', 'Electronics', 'Apparel', 'Pharma', 'Hardware', 'Beverage'];
  const units = ['pcs', 'kg', 'box', 'pack'];

  // Create Products
  const prodCount = 800;
  const products = [];
  for (let i = 0; i < prodCount; i++) {
    const wh = faker.helpers.arrayElement(whDocs);
    const gd = faker.helpers.arrayElement(wh.godowns);
    const comp = faker.helpers.arrayElement(gd.compartments);

    const cat = faker.helpers.arrayElement(categories);
    const sku = `SKU-${faker.string.alphanumeric(8).toUpperCase()}`;
    const batch = `B-${faker.string.alphanumeric(6).toUpperCase()}`;
  // expiry: 20% past (last 90 days), 30% soon (next 30 days), 50% far (31-365 days)
    const r = Math.random();
    let expiry;
  if (r < 0.2) expiry = faker.date.recent({ days: 90 });
    else if (r < 0.5) expiry = faker.date.soon({ days: randBetween(1, 30) });
    else expiry = faker.date.soon({ days: randBetween(31, 365) });

    const qty = randBetween(0, 500);

    products.push({
      sku,
      name: faker.commerce.productName(),
      category: cat,
      batchNumber: batch,
      expiryDate: expiry,
      quantity: qty,
      unit: faker.helpers.arrayElement(units),
      location: { warehouse: wh.name, godown: gd.name, compartment: comp.name, stack: `S${randBetween(1, comp.stacks)}` }
    });
  }

  console.log('Inserting products...');
  const productDocs = await Product.insertMany(products, { ordered: false });
  console.log(`Inserted products: ${productDocs.length}`);

  // Create some stock transactions
  const txns = [];
  for (let i = 0; i < 1200; i++) {
    const p = faker.helpers.arrayElement(productDocs);
    const type = Math.random() > 0.5 ? 'IN' : 'OUT';
    const qty = randBetween(1, 40);
    const ref = `${type}-${faker.string.alphanumeric(10).toUpperCase()}`;
    txns.push({ type, productId: p._id, quantity: qty, referenceId: ref, handledBy: faker.person.firstName() });
  }

  // Apply transactions updating product quantities safely
  console.log('Applying transactions...');
  let applied = 0;
  for (const t of txns) {
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const p = await Product.findById(t.productId).session(session);
      if (!p) return;
      if (t.type === 'OUT') {
        if (p.quantity < t.quantity) return; // skip if insufficient
        p.quantity -= t.quantity;
      } else {
        p.quantity += t.quantity;
      }
      await p.save({ session });
      await StockTransaction.create([t], { session });
    });
    session.endSession();
    applied++;
  }
  console.log(`Applied transactions: ${applied}`);

  console.log('Seeding completed');
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
