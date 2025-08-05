import { appConfig } from '../config/appConfig';

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly maxSize: number;

  constructor() {
    this.maxSize = appConfig.cache.maxSize;
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);

    if (!cached || Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  async set<T>(
    key: string,
    data: T,
    ttlMs: number = appConfig.cache.defaultTtl
  ): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  getSize(): number {
    return this.cache.size;
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export const cacheService = new CacheService();
