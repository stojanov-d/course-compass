export const TABLE_NAMES = {
  USERS: 'users',
  COURSES: 'courses',
  PROFESSORS: 'professors',
  REVIEWS: 'reviews',
  COMMENTS: 'comments',
} as const;

export type TableName = (typeof TABLE_NAMES)[keyof typeof TABLE_NAMES];
