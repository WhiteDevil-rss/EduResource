/**
 * Comprehensive, Universal Stub for Unsupported Node.js Modules in Cloudflare Workers.
 */

import { Readable } from 'node:stream';

function noop() {}
const emptyObject = {};
const emptyArray = [];

class StubAgent {
  constructor() {}
  addRequest() {}
  createConnection() {
    return {};
  }
}

class StubIncomingMessage extends Readable {
  constructor(socket = {}) {
    super();
    this.socket = socket;
    this.headers = {};
    this.method = 'GET';
    this.url = '/';
    this.complete = true;
  }

  _read() {}
}

// A base proxy that behaves like an object, a function, or a class.
const createStub = (name = 'Stub') => {
  const handler = {
    get: (target, prop) => {
      // Standard Node environment details
      if (prop === 'cwd') return () => '/';
      if (prop === 'env') return process.env || {};
      if (prop === 'platform') return 'linux';
      if (prop === 'arch') return 'x64';
      if (prop === 'version') return 'v20.0.0';
      if (prop === 'isatty') return () => false;

      // Special cases for common Node.js properties
      if (prop === 'promises') return createStub(`${name}.promises`);
      if (prop === 'constants') return emptyObject;
      if (prop === 'types') return emptyObject;
      if (prop === 'codes') return emptyObject;
      if (prop === 'IncomingMessage') return StubIncomingMessage;
      if (prop === 'TextEncoder') return globalThis.TextEncoder;
      if (prop === 'TextDecoder') return globalThis.TextDecoder;
      
      // AsyncLocalStorage mock
      if (prop === 'AsyncLocalStorage') {
        return class { 
          enterWith() {} 
          run(s, f) { return f(); } 
          getStore() { return {}; } 
        };
      }

      // For everything else, return a recursion of the stub
      return createStub(`${name}.${String(prop)}`);
    },
    // ALLOW ASSIGNMENTS so it doesn't crash on 'module.exports = ...' or other patches
    set: () => true,
    apply: () => undefined,
    construct: () => ({})
  };
  return new Proxy(noop, handler);
};

const universalStub = createStub('UniversalStub');

// Explicitly export common names to satisfy both CJS and ESM consumers
// Timers (Standard APIs)
export const setTimeout = globalThis.setTimeout;
export const clearTimeout = globalThis.clearTimeout;
export const setInterval = globalThis.setInterval;
export const clearInterval = globalThis.clearInterval;

// Fallback for Node-specific timers
export const setImmediate = (fn, ...args) => globalThis.setTimeout(fn, 0, ...args);
export const clearImmediate = (id) => globalThis.clearTimeout(id);

// HTTP/HTTPS compatibility shims
export class Agent extends StubAgent {}
export class Server extends StubAgent {}
export const globalAgent = new Agent();
export const METHODS = [];
export const STATUS_CODES = emptyObject;
export const request = () => ({
  addListener: noop,
  on: noop,
  prependListener: noop,
  once: noop,
  prependOnceListener: noop,
  removeListener: noop,
  off: noop,
  emit: () => false,
  listeners: () => emptyArray,
  listenerCount: () => 0,
  end: noop,
  setHeader: noop,
  removeHeader: noop,
  abort: noop,
  destroy: noop,
  setTimeout: noop
});
export const get = request;

// Querystring/Utils/Common Node internals
export const parse = (s) => ({});
export const stringify = (o) => '';
export const decode = (s) => ({});
export const encode = (o) => '';
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
export const release = () => '24.0.0'; // Modern
export const arch = () => 'x64';
export const platform = () => 'darwin';
export const userInfo = () => ({ username: 'edge' });
export const cpus = () => emptyArray;
export const getHeapStatistics = () => ({ total_heap_size: 0, total_heap_size_executable: 0, total_physical_size: 0, total_available_size: 0, used_heap_size: 0, heap_size_limit: 0, malloced_memory: 0, peak_malloced_memory: 0, does_zap_garbage: 0, number_of_native_contexts: 0, number_of_detached_contexts: 0 });

// Export as default for 'import x from "node:x"'
export default universalStub;
