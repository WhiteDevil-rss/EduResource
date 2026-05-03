#!/usr/bin/env node

import { performance } from 'node:perf_hooks'

const RUNS = clampNumber(process.env.BENCH_TREND_RUNS, 3, 2, 10)
const BASE_URL = String(process.env.BENCH_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const ITERATIONS = clampNumber(process.env.BENCH_ITERATIONS, 12, 1, 100)
const WARMUP = clampNumber(process.env.BENCH_WARMUP, 2, 0, 20)
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
  const response = await fetchWithTimeout(`${BASE_URL}/api/health`, {
    headers: { Accept: 'application/json' },
  })
  const elapsed = performance.now() - started
  if (!response.ok) {
    console.warn(`Health probe returned ${response.status} in ${fmtMs(elapsed)}; continuing.`)
    return
  }
  console.log(`Health probe OK in ${fmtMs(elapsed)}.`)
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

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function fmtMs(value) {
  return `${value.toFixed(1)}ms`
}

async function main() {
  console.log(`\nRunning trend benchmark for ${RUNS} run(s)...`)
  console.log(`Config: base=${BASE_URL}, warmup=${WARMUP}, iterations=${ITERATIONS}, timeout=${TIMEOUT_MS}ms`)

  await ensureServerAvailable()
  const auth = await loginAndGetCookie()
  const endpoints = resolveEndpoints(auth.role, Boolean(auth.cookie))

  const results = []

  for (let i = 1; i <= RUNS; i += 1) {
    console.log(`\n===== Trend Run ${i}/${RUNS} =====`)
    const runResults = []
    for (const endpoint of endpoints) {
      const endpointResult = await benchmarkEndpoint(endpoint, auth.cookie)
      runResults.push(endpointResult)
      const quickP95 = endpointResult.stats.count > 0 ? fmtMs(endpointResult.stats.p95) : 'n/a'
      console.log(`${endpoint} -> status ${endpointResult.statusCode ?? 'ERR'} | ok=${endpointResult.stats.count}/${ITERATIONS} | p95=${quickP95}`)
    }

    const allSamples = runResults.flatMap((entry) => entry.samples)
    const runP95 = computeStats(allSamples).p95
    const failures = runResults.reduce((sum, entry) => sum + entry.failures, 0)

    results.push({
      run: i,
      code: allSamples.length > 0 ? 0 : 1,
      p95: Number.isFinite(runP95) ? runP95 : null,
      failures,
    })
  }

  const valid = results.filter((entry) => entry.code === 0 && Number.isFinite(entry.p95))
  if (valid.length === 0) {
    console.error('\nNo successful benchmark runs with parseable p95 were found.')
    process.exitCode = 1
    return
  }

  const p95Values = valid.map((entry) => entry.p95)
  const best = Math.min(...p95Values)
  const worst = Math.max(...p95Values)
  const med = median(p95Values)

  console.log('\nTrend Summary')
  console.table(
    results.map((entry) => ({
      run: entry.run,
      exitCode: entry.code,
      failRuns: entry.failures,
      overallP95: Number.isFinite(entry.p95) ? fmtMs(entry.p95) : 'n/a',
    }))
  )

  console.log(`Best p95: ${fmtMs(best)}`)
  console.log(`Median p95: ${fmtMs(med)}`)
  console.log(`Worst p95: ${fmtMs(worst)}`)
  console.log(`Drift (worst-best): ${fmtMs(worst - best)}`)
}

main().catch((error) => {
  console.error(error?.message || error)
  process.exitCode = 1
})
