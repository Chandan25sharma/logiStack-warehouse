import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './db.js';

import inventoryRouter from './routes/inventory.js';
import stockRouter from './routes/stock.js';
import warehouseRouter from './routes/warehouse.js';
import reportsRouter from './routes/reports.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: '*'}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use('/api/inventory', inventoryRouter);
app.use('/api/stock', stockRouter);
app.use('/api/warehouse', warehouseRouter);
app.use('/api/reports', reportsRouter);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

connectDB()
  .then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)))
  .catch((e) => {
    console.error('Failed to start server', e);
    process.exit(1);
  });
