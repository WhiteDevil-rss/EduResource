/**
 * Comprehensive, Universal Stub for Unsupported Node.js Modules in Cloudflare Workers.
 */

const noop = () => {};
const emptyObject = {};
const emptyArray = [];

// A base proxy that behaves like an object, a function, or a class.
const createStub = (name = 'Stub') => {
  const handler = {
    get: (target, prop) => {
      // Standard timers
      if (prop === 'setImmediate') return (fn, ...args) => setTimeout(fn, 0, ...args);
      if (prop === 'clearImmediate') return (id) => clearTimeout(id);
      
      // Node specifics
      if (prop === 'promises') return createStub(`${name}.promises`);
      if (prop === 'constants') return emptyObject;
      
      // Standard Node environment details
      if (prop === 'cwd') return () => '/';
      if (prop === 'env') return process.env || {};
      if (prop === 'platform') return 'linux';
      if (prop === 'arch') return 'x64';
      if (prop === 'version') return 'v20.0.0';
      if (prop === 'isatty') return () => false;

      // Always return a self-referential Proxy for property access
      return createStub(`${name}.${String(prop)}`);
    },
    // Allow assignments by returning true for 'set'
    set: (target, prop, value) => {
      // Ignore but don't crash
      return true;
    },
    apply: () => undefined,
    construct: () => ({})
  };
  return new Proxy(noop, handler);
};

const universalStub = createStub('UniversalStub');

// Explicitly export common names to satisfy both CJS and ESM consumers
// Timers
export const setTimeout = (fn, delay, ...args) => globalThis.setTimeout(fn, delay, ...args);
export const clearTimeout = (id) => globalThis.clearTimeout(id);
export const setInterval = (fn, delay, ...args) => globalThis.setInterval(fn, delay, ...args);
export const clearInterval = (id) => globalThis.clearInterval(id);
export const setImmediate = (fn, ...args) => globalThis.setTimeout(fn, 0, ...args);
export const clearImmediate = (id) => globalThis.clearTimeout(id);

// Querystring
export const parse = () => ({});
export const stringify = () => '';
export const decode = () => ({});
export const encode = () => '';

// Common Node internals
export const promises = universalStub;
export const constants = emptyObject;
export const watch = noop;
export const readFileSync = noop;
export const writeFileSync = noop;
export const existsSync = () => false;
export const statSync = () => ({ isDirectory: () => false, isFile: () => false, size: 0 });
export const readdirSync = () => emptyArray;
export const createHash = universalStub;
export const createHmac = universalStub;
export const randomBytes = (n) => Buffer.alloc(n);
export const type = () => 'Darwin';
export const release = () => '23.0.0';
export const arch = () => 'x64';
export const platform = () => 'darwin';
export const userInfo = () => ({ username: 'edge' });
export const cpus = () => emptyArray;
export const getHeapStatistics = () => emptyObject;

// Export as default for 'import x from "node:x"'
export default universalStub;
