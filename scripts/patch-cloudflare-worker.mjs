import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

// Path to the generated worker file
const sourcePath = join(process.cwd(), '.open-next', 'worker.js');
const destPath = join(process.cwd(), '.open-next', 'assets', '_worker.js');

// Read the worker file
console.log(`Reading worker from: ${sourcePath}`);
const workerCode = readFileSync(sourcePath, 'utf-8');

// Patching logic: Fix relative paths and inject asset passthrough + error handling
console.log('Fixing relative paths and injecting logic in worker code...');
let patchedCode = workerCode
  .replace(/from "\.\//g, 'from "../')
  .replace(/import\("\.\//g, 'import("../');

// Inject ASSETS passthrough at the start of the fetch handler
const fetchStartIdx = patchedCode.indexOf('async fetch(request, env, ctx) {');
if (fetchStartIdx !== -1) {
  const insertionPoint = patchedCode.indexOf('{', fetchStartIdx) + 1;
  const passthroughLogic = `
        // Static asset passthrough
        const url = new URL(request.url);
        if (url.pathname.startsWith('/_next/static/') || url.pathname.includes('.')) {
          console.log('Static asset passthrough:', url.pathname);
          return env.ASSETS.fetch(request);
        }
`;
  patchedCode = patchedCode.slice(0, insertionPoint) + passthroughLogic + patchedCode.slice(insertionPoint);
}

// Wrap the main handler in a try/catch for better error logging
patchedCode = patchedCode.replace(
  /return handler\(reqOrResp, env, ctx, request\.signal\);/,
  `try {
                return await handler(reqOrResp, env, ctx, request.signal);
            } catch (err) {
                console.error('Worker Error:', err);
                return new Response('Internal Server Error', { status: 500 });
            }`
);

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