// Prints the size of the single-file build and fails if it exceeds the 40 MB budget.
import { statSync } from 'node:fs';

const LIMIT_MB = 40;
const bytes = statSync('dist/index.html').size;
const mb = bytes / (1024 * 1024);
console.log(`dist/index.html: ${mb.toFixed(2)} MB (limit ${LIMIT_MB} MB)`);
if (mb > LIMIT_MB) {
  console.error('Build exceeds the size budget.');
  process.exit(1);
}
