import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

// Path to the generated worker file
const sourcePath = join(process.cwd(), '.open-next', 'worker.js');
const destPath = join(process.cwd(), '.open-next', 'assets', '_worker.js');

// Read the worker file
console.log(`Reading worker from: ${sourcePath}`);
const workerCode = readFileSync(sourcePath, 'utf-8');

// Patching logic: Fix relative paths because we moved the worker from .open-next/ to .open-next/assets/
console.log('Fixing relative paths in worker code...');
const patchedCode = workerCode.replace(/from "\.\//g, 'from "../').replace(/import\("\.\//g, 'import("../');

// Write to the final assets location as _worker.js
console.log(`Writing patched worker to: ${destPath}`);
writeFileSync(destPath, patchedCode);

// Copy static HTML files that OpenNext might have missed
console.log('Copying static HTML files...');
const appDir = join(process.cwd(), '.next', 'server', 'app');
if (existsSync(appDir)) {
  const files = readdirSync(appDir, { recursive: true });
  files.forEach(file => {
    if (file.endsWith('.html')) {
      const src = join(appDir, file);
      if (statSync(src).isFile()) {
        const dest = join(process.cwd(), '.open-next', 'assets', file);
        const destDir = dirname(dest);
        
        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true });
        }
        
        console.log(`Copying ${file} to assets/`);
        copyFileSync(src, dest);
      }
    }
  });
}

console.log('Worker patched and assets synchronized successfully');