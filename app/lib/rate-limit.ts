type TokenBucket = { count: number; resetTime: number }

export function rateLimit(config: { interval: number; maxRequests: number }) {
  const tokens = new Map<string, TokenBucket>()
  let callCount = 0

  return {
    check(key: string): { success: boolean; remaining: number } {
      const now = Date.now()
      callCount++

      // Cleanup stale entries every 100 calls to prevent memory leak
      if (callCount % 100 === 0) {
        for (const [k, v] of tokens) {
          if (now > v.resetTime) tokens.delete(k)
        }
      }

      const entry = tokens.get(key)
      if (!entry || now > entry.resetTime) {
        tokens.set(key, { count: 1, resetTime: now + config.interval })
        return { success: true, remaining: config.maxRequests - 1 }
      }

      entry.count++
      if (entry.count > config.maxRequests) {
        return { success: false, remaining: 0 }
      }
      return { success: true, remaining: config.maxRequests - entry.count }
    },
  }
}
