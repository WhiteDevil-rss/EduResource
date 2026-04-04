import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { build } from 'esbuild';

const sourcePath = join(process.cwd(), '.open-next', 'worker.js');
const tempPatchedPath = join(process.cwd(), '.open-next', 'worker-patched.js');
const destPath = join(process.cwd(), '.open-next', 'assets', '_worker.js');
const assetsDir = join(process.cwd(), '.open-next', 'assets');
const stubPath = join(process.cwd(), 'scripts', 'node-stubs.js');

async function runPatch() {
  try {
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

    // Wrap the main handler (from server-functions) in a try/catch
    patchedCode = patchedCode.replace(
      /return handler\(reqOrResp, env, ctx, request\.signal\);/,
      `try {
                return await handler(reqOrResp, env, ctx, request.signal);
            } catch (err) {
                console.error('Runtime Handler Error:', err);
                return new Response(JSON.stringify({
                    error: 'Next.js Runtime Error',
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

    // Bundle with esbuild using JavaScript API for aliasing
    console.log('Bundling worker with esbuild JS API...');
    const banner = 'import { createRequire } from "node:module"; const require = createRequire("file:///worker.js");';
    
    await build({
      entryPoints: [tempPatchedPath],
      bundle: true,
      outfile: destPath,
      format: 'esm',
      target: 'esnext',
      platform: 'node',
      // Cloudflare provides these via nodejs_compat
      external: [
        'node:buffer',
        'node:async_hooks',
        'node:util',
        'node:events',
        'node:process',
        'node:stream',
        'node:path',
        'node:module',
        'node:url',
        'node:string_decoder',
        'node:diagnostics_channel',
        'node:crypto', 
        'node:zlib',
        'node:perf_hooks',
        'cloudflare:*'
      ],
      // Alias only truly unsupported modules to our stub
      alias: {
        'fs': stubPath,
        'node:fs': stubPath,
        'net': stubPath,
        'node:net': stubPath,
        'child_process': stubPath,
        'node:child_process': stubPath,
        'tls': stubPath,
        'node:tls': stubPath,
        'dns': stubPath,
        'node:dns': stubPath,
        'http': stubPath,
        'node:http': stubPath,
        'https': stubPath,
        'node:https': stubPath
      },
      loader: {
        '.wasm': 'dataurl',
      },
      banner: {
        js: banner,
      },
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      minify: false,
      logLevel: 'info',
    });

    console.log(`Bundled worker saved to: ${destPath}`);

    // Copy static HTML files
    console.log('Copying static HTML files...');
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

    console.log('Worker patched and bundled successfully.');
  } catch (error) {
    console.error('Patching/Bundling process failed:', error);
    process.exit(1);
  }
}

runPatch();