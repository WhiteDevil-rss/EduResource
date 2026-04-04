/**
 * Universal stub file for unsupported Node.js modules in Cloudflare Workers.
 * Uses a Proxy to provide "safe" undefined/noop exports for any requested name.
 */

const noop = () => {};
const emptyObject = {};

// Use a Proxy as the default export to handle any property access
const stub = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'promises') return stub;
    if (prop === 'constants') return emptyObject;
    return noop;
  }
});

// Since ESM doesn't support a dynamic export * from Proxy easily,
// we manually export the most common ones that cause build errors.
export const promises = stub;
export const constants = emptyObject;
export const watch = noop;
export const readFileSync = noop;
export const writeFileSync = noop;
export const existsSync = () => false;
export const statSync = () => ({ isDirectory: () => false, isFile: () => false });
export const createHash = noop;
export const createHmac = noop;
export const randomBytes = noop;

export default stub;
