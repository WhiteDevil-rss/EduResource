/**
 * Comprehensive stub file for unsupported Node.js modules in Cloudflare Workers.
 * This file uses a Proxy to provide safe no-op or empty values for any property access.
 */

const noop = () => {};
const emptyObject = {};
const emptyArray = [];

// A base proxy that returns itself/noop for any property access
const createStub = (name = 'Stub') => {
  const stub = new Proxy(noop, {
    get: (target, prop) => {
      // Common properties that should return specific types
      if (prop === 'promises') return stub;
      if (prop === 'constants') return emptyObject;
      if (prop === 'types') return emptyObject;
      if (prop === 'codes') return emptyObject;
      if (prop === 'AsyncLocalStorage') return class { enterWith() {}; run(s, f) { return f(); }; getStore() { return {}; }; };
      
      // If someone checks for standard Node properties
      if (prop === 'cwd') return () => '/';
      if (prop === 'env') return process.env || {};
      if (prop === 'platform') return 'linux';
      if (prop === 'arch') return 'x64';
      if (prop === 'version') return 'v20.0.0';
      
      return stub;
    },
    apply: () => {
      // If called as a function, return undefined or false for 'sync' checks
      return undefined;
    }
  });
  return stub;
};

const universalStub = createStub();

// Explicitly export common names to avoid "No matching export" build errors
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
export const hostname = () => 'edge';
export const networkInterfaces = () => ({});
export const userInfo = () => ({ username: 'edge' });
export const cpus = () => emptyArray;
export const heapStats = () => emptyObject;
export const getHeapStatistics = () => emptyObject;

// Export as default for 'import x from "node:x"'
export default universalStub;
