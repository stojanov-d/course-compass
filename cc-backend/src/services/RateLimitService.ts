import { appConfig } from '../config/appConfig';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimitService {
  private static instance: RateLimitService;
  private rateLimits = new Map<string, RateLimitEntry>();

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  private getKey(userId: string, operation: string): string {
    return `${userId}:${operation}`;
  }

  checkRateLimit(userId: string, operation: 'vote' | 'comment'): boolean {
    const key = this.getKey(userId, operation);
    const now = Date.now();
    const windowMs = appConfig.security.rateLimitWindowMs;

    const limit =
      operation === 'vote'
        ? appConfig.rateLimit.votesPerMinute
        : appConfig.rateLimit.commentsPerMinute;

    const entry = this.rateLimits.get(key);

    if (!entry || now >= entry.resetTime) {
      this.rateLimits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count++;
    this.rateLimits.set(key, entry);
    return true;
  }

  getRemainingRequests(userId: string, operation: 'vote' | 'comment'): number {
    const key = this.getKey(userId, operation);
    const now = Date.now();

    const limit =
      operation === 'vote'
        ? appConfig.rateLimit.votesPerMinute
        : appConfig.rateLimit.commentsPerMinute;

    const entry = this.rateLimits.get(key);

    if (!entry || now >= entry.resetTime) {
      return limit;
    }

    return Math.max(0, limit - entry.count);
  }

  getResetTime(userId: string, operation: 'vote' | 'comment'): number {
    const key = this.getKey(userId, operation);
    const entry = this.rateLimits.get(key);

    if (!entry) {
      return 0;
    }

    return entry.resetTime;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimits.entries()) {
      if (now >= entry.resetTime) {
        this.rateLimits.delete(key);
      }
    }
  }
}

export const rateLimitService = RateLimitService.getInstance();
