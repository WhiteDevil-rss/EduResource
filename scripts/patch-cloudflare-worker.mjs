import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Path to the generated worker file
const sourcePath = join(process.cwd(), '.open-next', 'worker.js');
const destPath = join(process.cwd(), '.open-next', 'assets', '_worker.js');

// Read the worker file
console.log(`Reading worker from: ${sourcePath}`);
const workerCode = readFileSync(sourcePath, 'utf-8');

// Patching logic...
// For example, if you need to add some code to the worker
const patchedCode = workerCode;

// Write to the final assets location as _worker.js
console.log(`Writing patched worker to: ${destPath}`);
writeFileSync(destPath, patchedCode);

console.log('Worker patched successfully');