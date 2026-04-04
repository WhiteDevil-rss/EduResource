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
      // Special cases for common Node.js properties
      if (prop === 'promises') return createStub(`${name}.promises`);
      if (prop === 'constants') return emptyObject;
      if (prop === 'types') return emptyObject;
      if (prop === 'codes') return emptyObject;
      if (prop === 'AsyncLocalStorage') {
        return class { 
          enterWith() {} 
          run(s, f) { return f(); } 
          getStore() { return {}; } 
        };
      }
      
      // Standard Node environment details
      if (prop === 'cwd') return () => '/';
      if (prop === 'env') return process.env || {};
      if (prop === 'platform') return 'linux';
      if (prop === 'arch') return 'x64';
      if (prop === 'version') return 'v20.0.0';
      if (prop === 'isatty') return () => false;

      // For everything else, return a recursion of the stub
      return createStub(`${name}.${String(prop)}`);
    },
    apply: () => undefined,
    construct: () => ({})
  };
  return new Proxy(noop, handler);
};

const universalStub = createStub('UniversalStub');

// Explicitly export common names to satisfy both CJS and ESM consumers
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
