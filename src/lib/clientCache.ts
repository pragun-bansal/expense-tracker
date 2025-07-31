// Simple client-side cache without external dependencies
interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>()

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Cache with automatic refresh
  async getOrFetch<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttlMs: number = 5 * 60 * 1000
  ): Promise<T> {
    const cached = this.get(key)
    
    if (cached) {
      return cached
    }

    const data = await fetchFn()
    this.set(key, data, ttlMs)
    return data
  }
}

// Global cache instance
export const cache = new SimpleCache()

// Cache keys for consistency
export const cacheKeys = {
  analytics: (period: string) => `analytics:${period}`,
  dashboard: () => 'dashboard:stats',
  categories: (type?: string) => `categories:${type || 'all'}`,
  accounts: () => 'accounts',
  groups: () => 'groups',
  budgets: () => 'budgets',
  recurringExpenses: () => 'recurring-expenses',
}