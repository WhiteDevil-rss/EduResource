/**
 * Lightweight request timing instrumentation
 * Measures critical path phases without blocking request flow
 */

export class RequestTimer {
  constructor(name = 'request') {
    this.name = name
    this.startTime = Date.now()
    this.phases = {}
    this.lastPhaseTime = this.startTime
  }

  markPhase(phaseName) {
    const now = Date.now()
    const duration = now - this.lastPhaseTime
    this.phases[phaseName] = {
      duration,
      timestamp: now,
      elapsed: now - this.startTime,
    }
    this.lastPhaseTime = now
  }

  getTotalDuration() {
    return Date.now() - this.startTime
  }

  getReport() {
    const totalDuration = this.getTotalDuration()
    return {
      name: this.name,
      totalMs: totalDuration,
      phases: this.phases,
    }
  }

  getHeaders() {
    const report = this.getReport()
    const phaseStr = Object.entries(report.phases)
      .map(([name, data]) => `${name}=${data.duration}ms`)
      .join(',')

    return {
      'X-Request-Timing-Total': `${report.totalMs}ms`,
      'X-Request-Timing-Phases': phaseStr,
    }
  }

  logReport() {}
}
