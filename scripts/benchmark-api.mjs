#!/usr/bin/env node

import { performance } from 'node:perf_hooks'

const BASE_URL = String(process.env.BENCH_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const ITERATIONS = clampNumber(process.env.BENCH_ITERATIONS, 15, 1, 100)
const WARMUP = clampNumber(process.env.BENCH_WARMUP, 3, 0, 20)
const TIMEOUT_MS = clampNumber(process.env.BENCH_TIMEOUT_MS, 20000, 1000, 120000)
const LOGIN_ID = String(process.env.BENCH_LOGIN_ID || '').trim()
const PASSWORD = String(process.env.BENCH_PASSWORD || '')
const SESSION_COOKIE = String(process.env.BENCH_SESSION_COOKIE || '').trim()
const ROLE_HINT = String(process.env.BENCH_ROLE || '').trim().toLowerCase()
const ENDPOINTS = parseEndpoints(process.env.BENCH_ENDPOINTS)

const DEFAULT_SEARCH_QUERY = '/api/search?q=math&type=resources&limit=20&scanLimit=150'
const DEFAULT_STUDENT_QUERY = '/api/student/resources?limit=120'
const DEFAULT_FACULTY_QUERY = '/api/faculty/resources?limit=200'

function clampNumber(input, fallback, min, max) {
  const value = Number(input)
  if (!Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.floor(value)))
}

function parseEndpoints(raw) {
  const value = String(raw || '').trim()
  if (!value) return null
  const endpoints = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (entry.startsWith('/') ? entry : `/${entry}`))

  return endpoints.length > 0 ? endpoints : null
}

function resolveEndpoints(role, hasAuthSession) {
  if (ENDPOINTS) return ENDPOINTS

  if (!hasAuthSession) {
    return ['/api/health', '/api/public/resource-count']
  }

  const roleValue = String(role || '').toLowerCase()
  if (roleValue === 'faculty') {
    return ['/api/session', DEFAULT_SEARCH_QUERY, DEFAULT_FACULTY_QUERY]
  }

  if (roleValue === 'admin') {
    return ['/api/session', DEFAULT_SEARCH_QUERY]
  }

  return ['/api/session', DEFAULT_SEARCH_QUERY, DEFAULT_STUDENT_QUERY]
}

function computeStats(samples) {
  if (!samples.length) {
    return {
      count: 0,
      avg: 0,
      min: 0,
      max: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    }
  }

  const sorted = [...samples].sort((a, b) => a - b)
  const sum = sorted.reduce((total, value) => total + value, 0)

  return {
    count: sorted.length,
    avg: sum / sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
  }
}

function percentile(sortedSamples, p) {
  if (!sortedSamples.length) return 0
  const index = Math.min(sortedSamples.length - 1, Math.max(0, Math.ceil(p * sortedSamples.length) - 1))
  return sortedSamples[index]
}

function fmtMs(value) {
  return `${value.toFixed(1)}ms`
}

function printHeader(message) {
  console.log(`\n${message}`)
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function ensureServerAvailable() {
  const started = performance.now()
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/health`, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const elapsed = performance.now() - started
      console.warn(`Health probe returned ${response.status} in ${fmtMs(elapsed)}; continuing.`)
      return
    }

    const elapsed = performance.now() - started
    console.log(`Health probe OK in ${fmtMs(elapsed)}.`)
  } catch (error) {
    throw new Error(`Cannot reach app at ${BASE_URL}. Start the app first (e.g. npm run dev). Reason: ${error?.message || error}`)
  }
}

async function loginAndGetCookie() {
  if (SESSION_COOKIE) {
    console.log(`Using BENCH_SESSION_COOKIE (${ROLE_HINT || 'unknown role'}).`)
    return { cookie: SESSION_COOKIE, role: ROLE_HINT }
  }

  if (!LOGIN_ID || !PASSWORD) {
    console.log('No BENCH_LOGIN_ID/BENCH_PASSWORD provided; running unauthenticated checks only.')
    return { cookie: '', role: '' }
  }

  const response = await fetchWithTimeout(`${BASE_URL}/api/auth/credential-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Origin: BASE_URL,
      Referer: `${BASE_URL}/login`,
    },
    body: JSON.stringify({ email: LOGIN_ID, password: PASSWORD }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(`Login failed (${response.status}): ${payload?.error || 'Unknown error'}`)
  }

  const cookieHeader = response.headers.get('set-cookie') || ''
  if (!cookieHeader) {
    throw new Error('Login succeeded but no session cookie was returned.')
  }

  const role = String(payload?.user?.role || payload?.role || '').toLowerCase()
  console.log(`Authenticated as ${payload?.user?.email || LOGIN_ID} (${role || 'unknown role'}).`)

  return {
    cookie: cookieHeader.split(';')[0],
    role,
  }
}

async function benchmarkEndpoint(path, cookie) {
  const target = `${BASE_URL}${path}`
  const samples = []
  let statusCode = null
  let failures = 0

  for (let i = 0; i < WARMUP; i += 1) {
    await fetchWithTimeout(target, {
      headers: {
        Accept: 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      cache: 'no-store',
    }).catch(() => null)
  }

  for (let i = 0; i < ITERATIONS; i += 1) {
    const started = performance.now()

    try {
      const response = await fetchWithTimeout(target, {
        headers: {
          Accept: 'application/json',
          ...(cookie ? { Cookie: cookie } : {}),
        },
        cache: 'no-store',
      })

      statusCode = response.status
      await response.arrayBuffer().catch(() => null)

      const elapsed = performance.now() - started

      if (response.ok) {
        samples.push(elapsed)
      } else {
        failures += 1
      }
    } catch {
      failures += 1
    }
  }

  return {
    path,
    statusCode,
    failures,
    samples,
    stats: computeStats(samples),
  }
}

function printResults(results) {
  printHeader('API Benchmark Results')
  console.table(
    results.map((entry) => ({
      endpoint: entry.path,
      status: entry.statusCode ?? 'ERR',
      okRuns: entry.stats.count,
      failRuns: entry.failures,
      avg: fmtMs(entry.stats.avg),
      p50: fmtMs(entry.stats.p50),
      p95: fmtMs(entry.stats.p95),
      p99: fmtMs(entry.stats.p99),
      min: fmtMs(entry.stats.min),
      max: fmtMs(entry.stats.max),
    }))
  )
}

async function main() {
  printHeader(`Benchmark config: base=${BASE_URL}, warmup=${WARMUP}, iterations=${ITERATIONS}, timeout=${TIMEOUT_MS}ms`)
  await ensureServerAvailable()

  const auth = await loginAndGetCookie()
  const endpoints = resolveEndpoints(auth.role, Boolean(auth.cookie))

  printHeader(`Running benchmarks for ${endpoints.length} endpoint(s)...`)

  const results = []
  for (const endpoint of endpoints) {
    const result = await benchmarkEndpoint(endpoint, auth.cookie)
    results.push(result)
    const quickP95 = result.stats.count > 0 ? fmtMs(result.stats.p95) : 'n/a'
    console.log(`${endpoint} -> status ${result.statusCode ?? 'ERR'} | ok=${result.stats.count}/${ITERATIONS} | p95=${quickP95}`)
  }

  printResults(results)

  const successfulEndpoints = results.filter((entry) => entry.stats.count > 0).length
  if (successfulEndpoints === 0) {
    process.exitCode = 1
    console.error('No successful benchmark samples were collected.')
    return
  }

  const overallP95 = computeStats(results.flatMap((entry) => entry.samples))

  printHeader(`Completed. Successful endpoints: ${successfulEndpoints}/${results.length}. Approx overall p95: ${fmtMs(overallP95.p95)}.`)
}

main().catch((error) => {
  console.error(error?.message || error)
  process.exitCode = 1
})
