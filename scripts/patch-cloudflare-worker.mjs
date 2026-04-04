import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

const sourcePath = join(process.cwd(), '.open-next', 'worker.js');
const tempPatchedPath = join(process.cwd(), '.open-next', 'worker-patched.js');
const destPath = join(process.cwd(), '.open-next', 'assets', '_worker.js');
const assetsDir = join(process.cwd(), '.open-next', 'assets');

// Read the worker file
console.log(`Reading worker from: ${sourcePath}`);
const workerCode = readFileSync(sourcePath, 'utf-8');

// Patching logic
console.log('Injecting logic in worker code...');
let patchedCode = workerCode;

// Inject ASSETS passthrough at the start of the fetch handler
const fetchStartIdx = patchedCode.indexOf('async fetch(request, env, ctx) {');
if (fetchStartIdx !== -1) {
  const insertionPoint = patchedCode.indexOf('{', fetchStartIdx) + 1;
  const passthroughLogic = `
        // Static asset passthrough
        const url = new URL(request.url);
        if (url.pathname.startsWith('/_next/static/') || url.pathname.includes('.')) {
          return env.ASSETS.fetch(request);
        }
`;
  patchedCode = patchedCode.slice(0, insertionPoint) + passthroughLogic + patchedCode.slice(insertionPoint);
}

// Wrap the main handler in a try/catch
patchedCode = patchedCode.replace(
  /return handler\(reqOrResp, env, ctx, request\.signal\);/,
  `try {
                return await handler(reqOrResp, env, ctx, request.signal);
            } catch (err) {
                console.error('Worker Error:', err);
                return new Response(JSON.stringify({
                    error: 'Internal Server Error',
                    message: err.message,
                    stack: err.stack
                }, null, 2), { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }`
);

// Write to temp file
writeFileSync(tempPatchedPath, patchedCode);

// Bundle with esbuild
console.log('Bundling worker with esbuild...');
try {
  // Use platform: node to resolve built-ins, but externalize them so Cloudflare handles them
  // We use a banner to provide 'require' compatibility
  const banner = 'import { createRequire } from "node:module"; const require = createRequire("http://local/worker.js");';
  execSync(`npx esbuild "${tempPatchedPath}" --bundle --outfile="${destPath}" --format=esm --target=esnext --platform=node --external:"node:*" --external:"cloudflare:*" --loader:.wasm=dataurl --banner:js='${banner}' --minify=false`, { stdio: 'inherit' });
  console.log(`Bundled worker saved to: ${destPath}`);
} catch (error) {
  console.error('Bundling failed:', error);
  process.exit(1);
}

// Copy static HTML and WASM files
console.log('Copying static HTML and WASM files...');
const serverAppDir = join(process.cwd(), '.next', 'server', 'app');
if (existsSync(serverAppDir)) {
  const files = readdirSync(serverAppDir, { recursive: true });
  files.forEach(file => {
    if (file.endsWith('.html')) {
      const src = join(serverAppDir, file);
      if (statSync(src).isFile()) {
        const dest = join(assetsDir, file);
        const destDir = dirname(dest);
        if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
        copyFileSync(src, dest);
      }
    }
  });
}

const wasmFiles = [
  'node_modules/next/dist/compiled/@vercel/og/yoga.wasm',
  'node_modules/next/dist/compiled/@vercel/og/resvg.wasm'
];
wasmFiles.forEach(wasmPath => {
  const src = join(process.cwd(), wasmPath);
  if (existsSync(src)) {
    const dest = join(assetsDir, wasmPath.split('/').pop());
    copyFileSync(src, dest);
  }
});

console.log('Worker patched and bundled successfully.');