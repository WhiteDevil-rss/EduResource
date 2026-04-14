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
 */
const nodeStubPlugin = {
  name: 'node-stub',
  setup(build) {
    const safeModules = new Set([
      'async_hooks', 'buffer', 'crypto', 'diagnostics_channel', 'events',
      'path', 'process', 'stream', 'string_decoder', 'url',
      'perf_hooks', 'readline', 'tty', 'zlib', 'assert',
      'module', 'util'
    ]);

    // Handle all node:* and bare Node modules
    build.onResolve({ filter: /^(node:)?([a-z_][a-z0-9_]*|timers\/promises)$/ }, (args) => {
        // Normalize the module name
        const originalPath = args.path.replace(/^node:/, '');
        const baseName = originalPath.split('/')[0];
        
        const isNodeModule = args.path.startsWith('node:') || 
          ['fs', 'os', 'vm', 'v8', 'inspector', 'child_process', 'cluster', 'dns', 'http', 'https', 'net', 'tls', 'dgram', 'readline', 'repl', 'tty', 'zlib', 'crypto', 'path', 'util', 'stream', 'events', 'buffer', 'process', 'timers', 'querystring'].includes(baseName);

        if (!isNodeModule) return null;

        if (!safeModules.has(baseName)) {
            // Redirect EVERYTHING from problematic modules (including sub-paths) to the stub
            return { path: stubPath };
        }
        
        return { path: args.path, external: true };
    });

    build.onResolve({ filter: /^cloudflare:.*$/ }, (args) => {
      return { path: args.path, external: true };
    });
  },
};

async function runPatch() {
  try {
    console.log(`Reading worker from: ${sourcePath}`);
    let workerCode = readFileSync(sourcePath, 'utf-8');

    console.log('Promoting dynamic imports to static for deep bundling...');
    // Replace dynamic imports of handlers to make them visible to esbuild
    const dynamicImportRegex = /const\s+\{\s*handler\s*\}\s+=\s+await\s+import\(\"\.\/server-functions\/default\/handler\.mjs\"\);/;
    if (dynamicImportRegex.test(workerCode)) {
      workerCode = 'import { handler as _handler } from "./server-functions/default/handler.mjs";\n' + workerCode;
      workerCode = workerCode.replace(dynamicImportRegex, 'const handler = _handler;');
      console.log('Successfully promoted dynamic handler to static import.');
    }

    console.log('Injecting ASSETS passthrough logic...');
    // Static asset passthrough logic for Cloudflare
    const fetchStartIdx = workerCode.indexOf('async fetch(request, env, ctx) {');
    if (fetchStartIdx !== -1) {
      const insertionPoint = workerCode.indexOf('{', fetchStartIdx) + 1;
      const passthroughLogic = `
        const url = new URL(request.url);
        if (url.pathname.startsWith('/_next/static/') || url.pathname.includes('.')) {
          return env.ASSETS.fetch(request);
        }
`;
      workerCode = workerCode.slice(0, insertionPoint) + passthroughLogic + workerCode.slice(insertionPoint);
    }

    // Wrap in diagnostic try/catch
    workerCode = workerCode.replace(
      /return handler\(reqOrResp, env, ctx, request\.signal\);/,
      `try {
                return await handler(reqOrResp, env, ctx, request.signal);
            } catch (err) {
                console.error('Edge Runtime Exception:', err);
                return new Response(JSON.stringify({
                    status: 'error',
                    code: 'RUNTIME_EXCEPTION',
                    message: err.message,
                    stack: err.stack,
                    diagnostics: 'If this is a "setImmediate" TypeError, the post-bundle sanitizer failed to defuse a frozen namespace mutation.'
                }, null, 2), { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }`
    );

    writeFileSync(tempPatchedPath, workerCode);

    console.log('Deep Bundling everything into a single _worker.js...');
    const bootLog = `console.log("[WORKER] Booting at: " + new Date().toISOString() + " | Platform: Cloudflare Pages");\n`;
    const banner = bootLog;
    
    await build({
      entryPoints: [tempPatchedPath],
      bundle: true,
      outfile: destPath,
      format: 'esm',
      target: 'esnext',
      platform: 'node',
      external: [
        'node:stream',
        'node:buffer',
        'node:path',
        'node:process',
        'node:url',
        'node:events',
        'node:util',
        'node:crypto',
        'node:module',
        'node:async_hooks',
        'node:stream/web',
        'node:stream/promises',
        'async_hooks',
        'events',
        'buffer',
        'crypto',
        'path',
        'process',
        'stream',
        'url',
        'util',
        'module'
      ],
      plugins: [nodeStubPlugin],
      resolveExtensions: ['.mjs', '.js', '.ts'],
      loader: {
        '.wasm': 'dataurl',
      },
      banner: {
        js: banner,
      },
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      // Remove 'alias' for node:* sub-paths as the plugin's regex handles it more flexibly
      minify: false,
      logLevel: 'info',
    });

    console.log(`Bundled worker saved to: ${destPath}`);

    // FINAL DEFUSE: Surgical String Patching the final bundle
    console.log('Post-Processing: Defusing illegal namespace mutations in the final bundle...');
    let finalBundle = readFileSync(destPath, 'utf-8');
    
    // We replace specific mutation targets with innocuous dummy property writes.
    // This circumvents "Cannot set property ... which has only a getter" on Edge.
    const mutations = [
        /nodeTimers[a-zA-Z]*\.setImmediate\s*=/g,
        /nodeTimers[a-zA-Z]*\.clearImmediate\s*=/g,
        /nodeTimersPromises[a-zA-Z]*\.setImmediate\s*=/g
    ];

    mutations.forEach(m => {
        finalBundle = finalBundle.replace(m, 'globalThis.___defused_mutation =');
    });
    
    console.log('Applied surgical patches to defuse frozen module TypeErrors.');
    writeFileSync(destPath, finalBundle);

    console.log('Worker deeply patched, bundled, and sanitized successfully.');
  } catch (error) {
    console.error('Deep Patching process failed:', error);
    process.exit(1);
  }
}

runPatch();