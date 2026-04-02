import fs from 'node:fs'
import path from 'node:path'

const workerPath = path.join(process.cwd(), '.open-next', 'worker.js')
const pagesWorkerPath = path.join(process.cwd(), '.open-next', '_worker.js')

if (!fs.existsSync(workerPath)) {
  console.error('Missing .open-next/worker.js. Run the OpenNext build first.')
  process.exit(1)
}

const polyfillBanner = `// Cloudflare runtime polyfills for Next server bundles\nif (typeof globalThis.WeakRef === 'undefined') {\n  globalThis.WeakRef = class WeakRef {\n    constructor(value) {\n      this._value = value\n    }\n    deref() {\n      return this._value\n    }\n  }\n}\n\nif (typeof globalThis.FinalizationRegistry === 'undefined') {\n  globalThis.FinalizationRegistry = class FinalizationRegistry {\n    register() {}\n    unregister() {\n      return false\n    }\n  }\n}\n\n`

let workerSource = fs.readFileSync(workerPath, 'utf8')
if (!workerSource.startsWith('// Cloudflare runtime polyfills for Next server bundles')) {
  workerSource = polyfillBanner + workerSource
  fs.writeFileSync(workerPath, workerSource)
}

fs.copyFileSync(workerPath, pagesWorkerPath)
console.log('Patched worker runtime and wrote .open-next/_worker.js')
