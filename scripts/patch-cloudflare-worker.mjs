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
      'path', 'process', 'stream', 'string_decoder', 'util', 'url',
      'perf_hooks', 'readline', 'tty', 'zlib', 'assert',
      'module'
    ]);

    // Handle all node:* and bare Node modules
    build.onResolve({ filter: /^(node:)?([a-z_][a-z0-9_]*)$/ }, (args) => {
      const isNodeModule = args.path.startsWith('node:') || 
        ['fs', 'os', 'vm', 'v8', 'inspector', 'child_process', 'cluster', 'dns', 'http', 'https', 'net', 'tls', 'dgram', 'readline', 'repl', 'tty', 'zlib', 'crypto', 'path', 'util', 'stream', 'events', 'buffer', 'process'].includes(args.path);

      if (!isNodeModule) return null;

      const moduleName = args.path.replace(/^node:/, '');
      if (!safeModules.has(moduleName)) {
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
    // Replace: const { handler } = await import("./server-functions/default/handler.mjs");
    // With: import { handler } from "./server-functions/default/handler.mjs";
    const dynamicImportRegex = /const\s+\{\s*handler\s*\}\s+=\s+await\s+import\(\"\.\/server-functions\/default\/handler\.mjs\"\);/;
    if (dynamicImportRegex.test(workerCode)) {
      workerCode = 'import { handler as _handler } from "./server-functions/default/handler.mjs";\n' + workerCode;
      workerCode = workerCode.replace(dynamicImportRegex, 'const handler = _handler;');
      console.log('Successfully promoted dynamic handler to static import.');
    }

    console.log('Injecting ASSETS passthrough logic...');
    // Static asset passthrough
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

    // Wrap in try/catch
    workerCode = workerCode.replace(
      /return handler\(reqOrResp, env, ctx, request\.signal\);/,
      `try {
                return await handler(reqOrResp, env, ctx, request.signal);
            } catch (err) {
                console.error('Deep Runtime Exception:', err);
                return new Response(JSON.stringify({
                    status: 'error',
                    code: 'RUNTIME_EXCEPTION',
                    message: err.message,
                    stack: err.stack,
                    diagnostics: 'If this is a "No such module" error, the stubbing layer failed to catch a dynamic dependency.'
                }, null, 2), { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }`
    );

    writeFileSync(tempPatchedPath, workerCode);

    console.log('Deep Bundling everything into a single _worker.js...');
    const banner = 'import { createRequire } from "node:module"; const require = createRequire("file:///worker.js");';
    
    await build({
      entryPoints: [tempPatchedPath],
      bundle: true,
      outfile: destPath,
      format: 'esm',
      target: 'esnext',
      platform: 'node',
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
      alias: {
        // Force resolve all node:* to the plugin/stub
        'node:fs': stubPath,
      },
      minify: false,
      logLevel: 'info',
    });

    console.log(`Bundled worker saved to: ${destPath}`);

    // Final Verification
    const finalContent = readFileSync(destPath, 'utf-8');
    if (finalContent.includes('import(')) {
      console.warn('Warning: Final bundle still contains dynamic imports. Deep stubbing might be partial.');
    }
    const forbidden = ['node:fs', 'node:v8', 'node:inspector', 'node:vm'];
    forbidden.forEach(mod => {
      if (finalContent.includes(mod)) {
        console.error(`FATAL ERROR: ${mod} found in the final bundle!`);
        process.exit(1);
      }
    });

    console.log('Worker deeply patched and bundled successfully.');
  } catch (error) {
    console.error('Deep Patching process failed:', error);
    process.exit(1);
  }
}

runPatch();