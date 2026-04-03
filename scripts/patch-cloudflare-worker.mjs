import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Path to the generated worker file
const workerPath = join(process.cwd(), '.open-next', 'assets', 'worker.js');

// Read the worker file
let workerCode = readFileSync(workerPath, 'utf-8');

// Add any necessary patches here
// For example, if you need to add some code to the worker

// Write back the patched code
writeFileSync(workerPath, workerCode);

console.log('Worker patched successfully');