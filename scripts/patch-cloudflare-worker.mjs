import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { build } from 'esbuild';

const sourcePath = join(process.cwd(), '.open-next', 'worker.js');
const tempPatchedPath = join(process.cwd(), '.open-next', 'worker-patched.js');
const destPath = join(process.cwd(), '.open-next', 'assets', '_worker.js');
const assetsDir = join(process.cwd(), '.open-next', 'assets');
const outDir = join(process.cwd(), '.open-next');
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
      'zlib', 'assert', 'util', 'module', 'perf_hooks', 'readline'
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

    // REQUIRE POLYFILL FOR EDGE
    // This allows legacy require() calls in Next.js internals to work in an ESM environment
    const requirePolyfill = `
import * as _async_hooks from "node:async_hooks";
import * as _buffer from "node:buffer";
import * as _crypto from "node:crypto";
import * as _diagnostics_channel from "node:diagnostics_channel";
import * as _events from "node:events";
import * as _path from "node:path";
import * as _process from "node:process";
import * as _stream from "node:stream";
import * as _url from "node:url";
import * as _util from "node:util";
import * as _module from "node:module";
import * as _zlib from "node:zlib";

const _node_modules = {
  "async_hooks": _async_hooks,
  "node:async_hooks": _async_hooks,
  "buffer": _buffer,
  "node:buffer": _buffer,
  "crypto": _crypto,
  "node:crypto": _crypto,
  "diagnostics_channel": _diagnostics_channel,
  "node:diagnostics_channel": _diagnostics_channel,
  "events": _events,
  "node:events": _events,
  "path": _path,
  "node:path": _path,
  "process": _process,
  "node:process": _process,
  "stream": _stream,
  "node:stream": _stream,
  "worker_threads": { markAsUncloneable: (v) => v, isMainThread: true, parentPort: null },
  "node:worker_threads": { markAsUncloneable: (v) => v, isMainThread: true, parentPort: null },
  "node:stream/web": {
    ReadableStream: globalThis.ReadableStream,
    WritableStream: globalThis.WritableStream,
    TransformStream: globalThis.TransformStream,
    TextEncoderStream: globalThis.TextEncoderStream,
    TextDecoderStream: globalThis.TextDecoderStream,
    CompressionStream: globalThis.CompressionStream,
    DecompressionStream: globalThis.DecompressionStream
  },
  "url": _url,
  "node:url": _url,
  "util": _util,
  "node:util": _util,
  "module": _module,
  "node:module": _module,
  "zlib": _zlib,
  "node:zlib": _zlib
};

globalThis.require = (name) => {
  // Normalize name by removing node: prefix for lookup if needed
  const normalized = name.startsWith('node:') ? name.substring(5) : name;
  const prefixed = name.startsWith('node:') ? name : 'node:' + name;
  
  if (_node_modules[name]) return _node_modules[name];
  if (_node_modules[prefixed]) return _node_modules[prefixed];
  if (_node_modules[normalized]) return _node_modules[normalized];
  
  console.warn(\`[EDGE-REQUIRE] Module not found: \${name}. Falling back to undefined.\`);
  return undefined; 
};

// Polyfill timers on globalThis for libraries that expect them
globalThis.setImmediate = (fn, ...args) => globalThis.setTimeout(fn, 0, ...args);
globalThis.clearImmediate = (id) => globalThis.clearTimeout(id);

// Top-level var declarations for maximum compatibility with bundled code
var module = { require: globalThis.require };
var require = globalThis.require;
var self = globalThis;
var global = globalThis;

globalThis.module = module;
globalThis.require = require;
globalThis.self = self;
globalThis.global = global;
`;
    const banner = bootLog + requirePolyfill;

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
        'node:diagnostics_channel',
        'node:perf_hooks',
        'node:readline',
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
        'module',
        'diagnostics_channel',
        'perf_hooks',
        'readline'
      ],
      alias: {
        'async_hooks': 'node:async_hooks',
        'events': 'node:events',
        'buffer': 'node:buffer',
        'crypto': 'node:crypto',
        'path': 'node:path',
        'process': 'node:process',
        'stream': 'node:stream',
        'url': 'node:url',
        'util': 'node:util',
        'module': 'node:module',
        'diagnostics_channel': 'node:diagnostics_channel',
        'perf_hooks': 'node:perf_hooks',
        'readline': 'node:readline'
      },
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
      minify: true,
      logLevel: 'info',
    });

    console.log(`Bundled worker saved to: ${destPath}`);

    // FINAL DEFUSE: Surgical String Patching the final bundle
    console.log('Post-Processing: Defusing illegal namespace mutations and fixing handler structures...');
    const mutations = [
      /\.setImmediate\s*=/g,
      /\.clearImmediate\s*=/g,
      /nodeTimers[a-zA-Z]*\.setImmediate\s*=/g,
      /nodeTimers[a-zA-Z]*\.clearImmediate\s*=/g,
      /nodeTimersPromises[a-zA-Z]*\.setImmediate\s*=/g
    ];

    // UNIVERSAL PATCHER: Walk the output directory and patch EVERY .js file
    function patchDirectory(dir) {
      const files = readdirSync(dir);
      for (const file of files) {
        const fullPath = join(dir, file);
        if (statSync(fullPath).isDirectory()) {
          patchDirectory(fullPath);
        } else if (file.endsWith('.js')) {
          let content = readFileSync(fullPath, 'utf-8');
          let changed = false;

          // FIX 1: Targeted require patching
          // IMPORTANT: Only patch the bare `module.require(` and `this.require(` patterns.
          // DO NOT replace registry-style calls like `__next_app__.require(` or `e.require(`
          // because those point to Next.js's internal module registry, not the Node.js `module` global.
          // Replacing them with globalThis.require() would break the entire module loading system.
          if (content.includes('module.require(') || content.includes('this.require(')) {
            content = content.replace(/\bmodule\.require\(/g, 'globalThis.require(');
            content = content.replace(/\bthis\.require\(/g, 'globalThis.require(');
            changed = true;
          }

          // FIX 2: ComponentMod.handler resilience (only for worker or chunks)
          if (content.includes('components.ComponentMod.handler')) {
            content = content.replace(
              /return await components\.ComponentMod\.handler\(/g,
              'const _h = components.ComponentMod; const _target = (typeof _h.handler === "function" ? _h.handler : (_h.default && typeof _h.default.handler === "function" ? _h.default.handler : _h.handler));\nreturn await _target('
            );
            changed = true;
          }

          // FIX 3: Mutation Defuser
          for (const reg of mutations) {
            if (reg.test(content)) {
              content = content.replace(reg, '.____mut_defused =');
              changed = true;
            }
          }

          if (changed) {
            console.log(`[PATCHED] ${fullPath}`);
            writeFileSync(fullPath, content);
          }
        }
      }
    }

    // UNIVERSAL PATCHER: Walk the output directory to patch source files
    console.log('Starting Universal Patching of .open-next directory...');
    patchDirectory(outDir);

    // SURGICAL PATCH #4: Fix the Xe module factory in the final _worker.js
    // ====================================================================
    // The root cause of "Cannot read properties of undefined (reading 'require')":
    //   esbuild's CJS module shim creates module objects as {exports:{}} with NO .require property.
    //   Next.js internals (e.g. app-page-turbo.runtime.prod.js) use `module.require(...)` to
    //   load dynamic chunks at runtime, expecting a Node.js-style CJS module object.
    // Fix: patch the Xe factory to inject require: globalThis.require into every module object.
    console.log('Patching Xe CJS module factory to inject require...');
    let workerContent = readFileSync(destPath, 'utf-8');
    // The pattern we want to replace is the module object creation inside the Xe factory.
    // esbuild generates: (A={exports:{}}).exports,A)
    // We change it to:   (A={exports:{},require:globalThis.require}).exports,A)
    const xePattern = /\(A=\{exports:\{\}\}\)\.exports,A\)/g;
    const xeReplacement = '(A={exports:{},require:globalThis.require}).exports,A)';
    if (xePattern.test(workerContent)) {
      workerContent = workerContent.replace(xePattern, xeReplacement);
      writeFileSync(destPath, workerContent);
      console.log('[PATCHED] Xe module factory in _worker.js — module.require is now available inside CJS factories');
    } else {
      console.warn('[WARN] Xe pattern not found in _worker.js — the module factory structure may have changed');
    }

    // Relying on esbuild banner for requirePolyfill injection to avoid duplicates



    console.log('\u001b[32m\u001b[1m✅ SURGICAL STABILIZATION COMPLETE\u001b[22m\u001b[39m');
  } catch (e) {
    console.error('\u001b[31m\u001b[1m❌ PATCHING FAILED:\u001b[22m\u001b[39m', e);
    process.exit(1);
  }
}

runPatch();