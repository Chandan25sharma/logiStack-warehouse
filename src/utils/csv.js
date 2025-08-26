import { stringify } from 'csv-stringify';

export function sendCSV(res, rows, columns, filename = 'export.csv') {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const stringifier = stringify({ header: true, columns });
  rows.forEach(r => stringifier.write(r));
  stringifier.end();
  stringifier.pipe(res);
}
