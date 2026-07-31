export interface PassTiming {
  readonly pass: string
  readonly ms: number
}

export class Profiler {
  private readonly samples = new Map<string, number[]>()
  private readonly maxSamples: number

  constructor(maxSamples = 120) {
    this.maxSamples = maxSamples
  }

  measure<T>(pass: string, fn: () => T): T {
    const start = performance.now()
    const result = fn()
    this.record(pass, performance.now() - start)
    return result
  }

  summary(): PassTiming[] {
    const result: PassTiming[] = []
    for (const [pass, values] of this.samples) {
      result.push({ pass, ms: average(values) })
    }
    return result
  }

  totalMs(): number {
    return sum(this.summary().map((entry) => entry.ms))
  }

  private record(pass: string, ms: number): void {
    const values = this.samples.get(pass) ?? []
    values.push(ms)
    if (values.length > this.maxSamples) {
      values.shift()
    }
    this.samples.set(pass, values)
  }
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length
}

function sum(values: number[]): number {
  let total = 0
  for (const value of values) {
    total += value
  }
  return total
}
