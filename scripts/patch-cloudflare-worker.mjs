import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { build } from 'esbuild';

const sourcePath = join(process.cwd(), '.open-next', 'worker.js');
const tempPatchedPath = join(process.cwd(), '.open-next', 'worker-patched.js');
const destPath = join(process.cwd(), '.open-next', 'assets', '_worker.js');
const assetsDir = join(process.cwd(), '.open-next', 'assets');
const stubPath = join(process.cwd(), 'scripts', 'node-stubs.js');

/**
 * esbuild Plugin to dynamically stub unsupported Node.js modules.
 * This redirects any legacy or non-edge-compatible imports (like v8, inspector, os) 
 * to our safe node-stubs.js file.
 */
const nodeStubPlugin = {
  name: 'node-stub',
  setup(build) {
    // List of modules natively supported by Cloudflare Workers (nodejs_compat flag)
    const safeModules = new Set([
      'async_hooks',
      'buffer',
      'crypto',
      'diagnostics_channel',
      'events',
      'path',
      'process',
      'stream',
      'string_decoder',
      'util',
      'url',
      'timers',
      'perf_hooks',
      'readline',
      'tty',
      'zlib',
      'assert',
      'module',
      'querystring',
      'string_decoder'
    ]);

    // Match both 'node:module' and 'module' formats
    build.onResolve({ filter: /^(node:)?([a-z_][a-z0-9_]*)$/ }, (args) => {
      const isNodeModule = args.path.startsWith('node:') || 
        ['fs', 'os', 'vm', 'v8', 'inspector', 'child_process', 'cluster', 'dns', 'http', 'https', 'net', 'tls', 'dgram', 'readline', 'repl', 'tty', 'zlib', 'crypto', 'path', 'util', 'stream', 'events', 'buffer', 'process'].includes(args.path);

      if (!isNodeModule) return null;

      const moduleName = args.path.replace(/^node:/, '');
      
      // If NOT in the safe list, redirect to our universal stub
      if (!safeModules.has(moduleName)) {
        return { path: stubPath };
      }

      // If IT IS in the safe list, let esbuild treat it as an external import
      return { path: args.path, external: true };
    });

    // Ensure cloudflare:* imports remain external
    build.onResolve({ filter: /^cloudflare:.*$/ }, (args) => {
      return { path: args.path, external: true };
    });
  },
};

async function runPatch() {
  try {
    console.log(`Reading worker from: ${sourcePath}`);
    const workerCode = readFileSync(sourcePath, 'utf-8');

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
                console.error('Next.js Runtime Error:', err);
                return new Response(JSON.stringify({
                    error: 'Runtime Exception',
                    message: err.message,
                    stack: err.stack,
                    tip: 'This usually occurs when an incompatible Node.js API is called at runtime.'
                }, null, 2), { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }`
    );

    writeFileSync(tempPatchedPath, patchedCode);

    console.log('Bundling worker with Robust Node-Stub Plugin...');
    const banner = 'import { createRequire } from "node:module"; const require = createRequire("file:///worker.js");';
    
    await build({
      entryPoints: [tempPatchedPath],
      bundle: true,
      outfile: destPath,
      format: 'esm',
      target: 'esnext',
      platform: 'node',
      plugins: [nodeStubPlugin],
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

    // Copy static files
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