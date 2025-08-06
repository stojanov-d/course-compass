export const appConfig = {
  cache: {
    defaultTtl: parseInt(process.env.CACHE_TTL || '300000'), // 5 minutes
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
  },
  rateLimit: {
    votesPerMinute: parseInt(process.env.VOTES_PER_MINUTE || '10'),
    commentsPerMinute: parseInt(process.env.COMMENTS_PER_MINUTE || '5'),
  },
  validation: {
    maxReviewLength: parseInt(process.env.MAX_REVIEW_LENGTH || '2000'),
    maxCommentLength: parseInt(process.env.MAX_COMMENT_LENGTH || '500'),
    minReviewLength: parseInt(process.env.MIN_REVIEW_LENGTH || '10'),
    minCommentLength: parseInt(process.env.MIN_COMMENT_LENGTH || '5'),
  },
  security: {
    enableInputSanitization: process.env.ENABLE_INPUT_SANITIZATION !== 'false',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  },
};

export type AppConfig = typeof appConfig;
